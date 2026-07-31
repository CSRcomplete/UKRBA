import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateAI } from './ai-engine.js';
import { ONE_PAGE_PROMPT, EMAIL_SEQUENCE_PROMPT } from './prompt.js';
import { generatePdfFromJSON, generatePolicyPdf, generateCertificatePdf } from './pdf-generator.js';
import { scrapeWebsite } from './scraper.js';
import { generatePaidSuite, generateSingleAsset } from './paid-engine.js';

const app = express();

// Robust CORS configuration
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Manual Preflight handler just in case
app.options('*', cors()); 

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
    res.json({
        status: 'AI Engine is LIVE and READY.',
        version: '1.0.2',
        deployedAt: '2026-07-08T14:59:00Z'
    });
});

app.get('/api/logs', (req, res) => {
    res.json(globalLogs);
});

app.get('/api/list-reports', (req, res) => {
    const dirPath = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(dirPath)) {
        return res.json([]);
    }
    fs.readdir(dirPath, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Map files to include their modification timestamps
        const fileListWithMetadata = files.map(file => {
            try {
                const stats = fs.statSync(path.join(dirPath, file));
                return { name: file, mtime: stats.mtimeMs };
            } catch (e) {
                return { name: file, mtime: 0 };
            }
        });
        
        // Sort files by newest first
        fileListWithMetadata.sort((a, b) => b.mtime - a.mtime);
        res.json(fileListWithMetadata);
    });
});

app.post('/api/upload-report', (req, res) => {
    const { filename, base64Data } = req.body;
    if (!filename || !base64Data) {
        return res.status(400).json({ error: 'Missing filename or base64Data' });
    }
    
    // Safety check to prevent path traversal
    const safeFilename = path.basename(filename);
    const dirPath = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    
    const filePath = path.join(dirPath, safeFilename);
    const buffer = Buffer.from(base64Data, 'base64');
    
    fs.writeFile(filePath, buffer, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ status: 'success', url: `/reports/${safeFilename}` });
    });
});

const globalLogs = [];
const log = (...args) => {
    const msg = new Date().toISOString() + ': ' + args.join(' ');
    console.log(msg);
    globalLogs.push(msg);
    if (globalLogs.length > 100) globalLogs.shift();
};
const logError = (...args) => {
    const msg = new Date().toISOString() + ' ERROR: ' + args.join(' ');
    console.error(msg);
    globalLogs.push(msg);
    if (globalLogs.length > 100) globalLogs.shift();
};

// Serve the reports folder publicly so Wix can download the PDFs
app.use('/reports', express.static('public/reports'));

/**
 * UNIFIED FORM SUBMISSION
 * Detects membership status and generates exactly ONE document.
 * - Member: 8-page Master Assessment Report
 * - Non-member: 1-page Summary Audit
 */
async function handleFormSubmission(userData) {
    // Force paid flow for UKRBA
    const isMember = true;
    
    log(`Form Submission Received. UKRBA Paid Suite: ${isMember ? 'YES' : 'NO'} (${userData.businessName || userData.title || 'Unknown'})`);

    // Run in the background
    setImmediate(async () => {
        try {
            let downloadUrl;
            let accreditationLevel;

            log(`Processing Submission (UKRBA Paid Suite)...`);
            
            let websiteText = "No website provided.";
            const targetUrl = userData.company_url || userData.companyUrl || userData.url;
            if (targetUrl) {
                websiteText = await scrapeWebsite(targetUrl);
            }
            userData.websiteContext = websiteText;
            userData.isMember = isMember;

            const suiteResults = await generatePaidSuite(userData, log);
            downloadUrl = suiteResults.downloadUrl;
            accreditationLevel = suiteResults.level;

            if (!isMember || userData.isFivePoundPlan || !userData.isMember) {
                try {
                    log("Generating personalized emails for £5 user...");
                    const emailData = {
                        businessName: userData.title || userData.businessName || "Business Owner",
                        websiteText: websiteText || "No website data available.",
                        assessmentContext: `Level: ${accreditationLevel}, Position: ${userData.overallPosition}`
                    };
                    
                    let formattedPrompt = EMAIL_SEQUENCE_PROMPT;
                    formattedPrompt = formattedPrompt.replace(/{businessName}/g, () => emailData.businessName);
                    formattedPrompt = formattedPrompt.replace(/{websiteText}/g, () => emailData.websiteText);

                    const emailJsonString = await generateAI(formattedPrompt, emailData, "EMAIL_SEQUENCE");
                    userData.generatedEmails = JSON.parse(emailJsonString);
                    log("✅ Personalized emails generated successfully.");
                } catch (e) {
                    logError("❌ Email generation failed:", e.message);
                    // Attach error to userData so we can see it in the webhook
                    userData.emailError = e.message;
                }
            }

            // Webhook Notification
            if (userData.webhookUrl) {
                let targetWebhook = userData.webhookUrl;
                if (targetWebhook.includes('ukrba.co.uk')) {
                    targetWebhook = targetWebhook.replace('ukrba.co.uk', 'ukrba.org');
                } else if (targetWebhook.includes('csrcomplete.co.uk')) {
                    targetWebhook = targetWebhook.replace('csrcomplete.co.uk', 'ukrba.org');
                }
                
                log(`[STAGE 3] Pinging Wix Webhook: ${targetWebhook}`);
                
                const payload = {
                    downloadUrl: downloadUrl,
                    certificateUrl: suiteResults.certificateUrl,
                    membershipCertificateUrl: suiteResults.membershipCertificateUrl,
                    badgeUrl: suiteResults.badgeUrl, // Added this
                    email: userData.email,
                    memberId: userData.memberId,
                    accreditationLevel: accreditationLevel,
                    status: userData.isFivePoundPlan ? 'five_pound_completed' : (isMember ? 'paid_suite_completed' : 'completed')
                };

                if ((!isMember || userData.isFivePoundPlan || !userData.isMember) && userData.generatedEmails) {
                    const emails = userData.generatedEmails;
                    payload.email1Body = emails.email1?.body;
                    payload.email1Subject = emails.email1?.subject;
                    payload.email2Body = emails.email2?.body;
                    payload.email2Subject = emails.email2?.subject;
                    payload.email3Body = emails.email3?.body;
                    payload.email3Subject = emails.email3?.subject;
                }
                
                if (userData.emailError) {
                    payload.emailError = userData.emailError;
                }

                if (isMember) {
                    payload.policies = [{ id: 'master-report', title: 'Master Assessment Report', url: downloadUrl }];
                }

                log(`[STAGE 4] Sending payload to Wix for ${userData.memberId || userData.email}`);
                
                const webhookResponse = await fetch(targetWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const responseText = await webhookResponse.text();
                log(`[STAGE 5] Wix Response (${webhookResponse.status}): ${responseText}`);
            } else {
                log("No webhookUrl provided. Process complete.");
            }

        } catch (error) {
            logError("Background processing error:", error.message);
            if (userData.webhookUrl) {
                let targetWebhook = userData.webhookUrl;
                if (targetWebhook.includes('ukrba.co.uk')) {
                    targetWebhook = targetWebhook.replace('ukrba.co.uk', 'ukrba.org');
                } else if (targetWebhook.includes('csrcomplete.co.uk')) {
                    targetWebhook = targetWebhook.replace('csrcomplete.co.uk', 'ukrba.org');
                }
                try {
                    await fetch(targetWebhook, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: error.message, status: 'failed' })
                    });
                } catch (e) {
                    logError("Failed to notify Wix of error.");
                }
            }
        }
    });
}

/**
 * Endpoint for the unified form.
 */
app.post('/api/submit-form', (req, res) => {
    handleFormSubmission(req.body);
    res.status(202).json({
        status: 'accepted',
        message: 'Form submission accepted. Report is being generated.'
    });
});

/**
 * Backward compatibility: Free Summary endpoint (Now forced paid under UKRBA)
 */
app.post('/api/generate-free-summary', (req, res) => {
    req.body.isMember = true; // Force paid
    handleFormSubmission(req.body);
    res.status(202).json({ status: 'accepted', message: 'UKRBA paid suite generation started.' });
});

/**
 * Backward compatibility: Paid Suite endpoint
 */
app.post('/api/generate-paid-suite', (req, res) => {
    req.body.isMember = true; // Force paid
    handleFormSubmission(req.body);
    res.status(202).json({ status: 'accepted', message: 'UKRBA paid suite generation started.' });
});
 
 /**
  * NEW: DASHBOARD ON-DEMAND GENERATION
  * Generates a single policy/asset synchronously in <10 seconds.
  */
app.post('/api/generate-single-asset', async (req, res) => {
    const { userData, assetId } = req.body;
    
    if (!userData || !assetId) {
        return res.status(400).json({ error: 'Missing userData or assetId' });
    }

    try {
        log(`On-Demand Request: ${assetId} for ${userData.businessName || userData.title}`);
        const asset = await generateSingleAsset(userData, assetId, log);
        res.json(asset);
    } catch (error) {
        logError("Single Asset Generation Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AI Engine Backend running on port ${PORT}`);
});
