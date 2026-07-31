import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PAID_POLICIES, ACCREDITATION_BADGES } from './paid-prompts.js';
import { callClaude } from './ai-engine.js';
import { generatePolicyPdf, generateCertificatePdf, generateMembershipCertificatePdf, generateFullReportPdf } from './pdf-generator.js';

const STRICT_RULES = `

=========================================
STRICT DOCUMENT WRITING, SPELLING & COMPLIANCE RULES:
You MUST follow these rules exactly. Any violation of these rules makes the document invalid.

1. NO DASHES OR HYPHENS: Do not use dashes or hyphens anywhere in the document. This includes hyphens (-), en dashes (–), em dashes (—), dash-style sentence breaks, or dash-style explanations. Use commas, full stops, or colons instead.
   - For example, instead of writing "UK-based business", write "UK based business" or "business based in the UK".
   - Instead of writing "science-based target validation", write "science based target validation".

2. BRITISH/UK ENGLISH ONLY: Write strictly in professional UK English. You must use UK spellings instead of US spellings (e.g., use "personalise" instead of "personalize", "organise" instead of "organize", "behaviour" instead of "behavior", "programme" instead of "program", "colour" instead of "color", etc.).

3. NO MARKDOWN HEADINGS: Do not use markdown heading formatting in any document. NEVER output headings using markdown markers such as #, ##, ###, or ####.
   - All numbered headings must display as clean business headings only.
   - Format them as plain bold text using double asterisks (e.g. "**1. Introduction**" or "**Section 1: Executive Summary**") with no leading hashes.

4. SME REALISM RULE: This policy is for a real UK SME (Small and Medium-sized Enterprise), not a large corporation, government department, or public body.
   - Use practical, realistic SME language.
   - Avoid unnecessary corporate language such as: "steering committee", "board subcommittee", "executive oversight framework", "formal ESG governance committee", "independent validation body", "science based target validation", "TCFD reporting".
   - The policy should sound like a credible, responsible UK business that is putting proper systems in place.

5. NO UNREALISTIC COMMITTEES / AUTHORING INFO:
   - Do not use wording such as: "Steering Committee", "ESG Steering Committee", "Governance Committee", or "Internal Committee" unless specifically provided by the user.
   - Under the document header, you must include the following line exactly:
     "Document Prepared By: UKRBA"

6. BUSINESS SPECIFIC POLICY RULE:
   - The policy must be written around the specific business reality of this company based on the provided details (their activities, sector, workforce, suppliers, and realistic ESG risks).
   - If the policy is too generic and could easily be used by any unrelated company, rewrite it to be specific to their actual operations.
=========================================
`;


export async function generatePaidSuite(data, log = console.log) {
    log(`Starting Paid Suite (Master Report) Generation for: ${data.businessName || data.title}`);
    
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
        : `http://localhost:${process.env.PORT || 3000}`;
    
    // Normalize naming from Wix (underscore to camelCase)
    data.businessName = data.businessName || data.business_name || data.title;
    data.companyUrl = data.companyUrl || data.company_url || data.url;
    data.businessDescription = data.businessDescription || data.business_description || data.describeBusiness;
    data.isFivePoundPlan = data.isFivePoundPlan === true || data.isFivePoundPlan === 'true' || data.isFivePoundPlan === 1 || data.isFivePoundPlan === '1';

    // Helper to save PDF
    const savePdf = (buffer, prefix) => {
        const fileId = crypto.randomBytes(8).toString('hex');
        const filename = `${prefix}_${fileId}.pdf`;
        const filepath = path.join(process.cwd(), 'public', 'reports', filename);
        
        if (!fs.existsSync(path.join(process.cwd(), 'public', 'reports'))) {
            fs.mkdirSync(path.join(process.cwd(), 'public', 'reports'), { recursive: true });
        }
        
        fs.writeFileSync(filepath, buffer);
        return `${baseUrl}/reports/${filename}`;
    };

    // 1. Calculate Accreditation Level (Targeting only question keys q4-q30)
    const questionKeys = Object.keys(data).filter(key => key.startsWith('q'));
    const yesCount = questionKeys.filter(key => data[key] === 'Yes' || data[key] === true).length;
    
    let level = 1;
    // Adjusted for a ~26 question form
    if (yesCount >= 24) level = 5;
    else if (yesCount >= 18) level = 4;
    else if (yesCount >= 12) level = 3;
    else if (yesCount >= 6) level = 2;
    
    data.level = level; 
    
    // Get the badge URL
    const badgeUrl = ACCREDITATION_BADGES[level];
    data.badgeUrl = badgeUrl;

    // 1b. Determine Overall Position wording
    const positions = {
        1: "Foundational Practice",
        2: "Developing Responsible Practice",
        3: "Established Responsible Practice",
        4: "Advanced Responsible Practice",
        5: "Embedded Responsible Practice"
    };
    data.overallPosition = positions[level] || "Assessed Responsible Practice";
    data.reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    data.diaryUrl = data.diaryUrl || data.q21 || data.url || "Not provided"; // Fallback for diary

    // 1c. Membership Status Wording
    const isMember = true;
    if (data.isFivePoundPlan) {
        data.report_header_title = `If you were a member you would be UKRBA Accredited Level ${level}`;
        data.accreditation_status_label = "Accreditation Status";
        data.level_display = `If you were a member you would be UKRBA Accredited Level ${level}`;
        data.overall_position_label = "Projected Position";
        data.status_instruction = "This is a pre-accreditation assessment report (5GBP report) used to help sell our main subscription plans (e.g. £59/month). You MUST NOT write anywhere that the accreditation has been granted, awarded, or is currently active. The tone throughout the entire report MUST be forward-looking, indicating that 'You will be accredited' (e.g. 'Upon activating your main subscription plan, you will be accredited at Level " + level + "'). Emphasize that the business qualifies for Level " + level + " and will receive full accreditation once they upgrade to one of our main plans (like the £59 plan). Make sure there is NO mention of accreditation already being active, granted, or awarded.";
    } else if (isMember) {
        data.report_header_title = `UKRBA ACCREDITED, LEVEL ${level} Full CSR and ESG Assessment Report`;
        data.accreditation_status_label = "Accreditation Level";
        data.level_display = `UKRBA Level ${level}`;
        data.overall_position_label = "Overall Position";
        data.status_instruction = "This is a formal accreditation. State clearly that the business HAS BEEN AWARDED this level and is now UKRBA Accredited. You MUST NOT use conditional language like 'you would get the accreditation' or 'indicates a potential for accreditation'. Write definitively that they ARE accredited.";
    } else {
        data.report_header_title = `UKRBA ASSESSMENT: Preliminary CSR and ESG Report`;
        data.accreditation_status_label = "Accreditation Level";
        data.level_display = "Subscribe to unlock your accreditation level";
        data.overall_position_label = "Potential Position";
        data.status_instruction = "This is a preliminary assessment, NOT a formal accreditation. You MUST NOT award any level and you MUST NOT mention a specific level number (e.g. do not say Level 1, 2, etc.). Instead, use wording like 'You would be at accreditation level' or 'This assessment indicates a potential for accreditation'. It is important that you do not state they are already part of UKRBA or accredited yet.";
    }

    // 2. Generate Master Report ONLY at submission
    const masterPolicy = PAID_POLICIES.find(p => p.id === 'master-report');
    if (!masterPolicy) throw new Error("Master Report prompt not found.");

    log(`Generating Master Assessment Report for ${data.businessName} (Level ${level})...`);
    let finalPrompt = masterPolicy.prompt;
    
    if (data.isFivePoundPlan) {
        finalPrompt = finalPrompt
            .replace("the overall accreditation position in plain terms", "the projected accreditation level they qualify for and will receive upon full plan activation (e.g. the £59 plan)")
            .replace("a brief explanation of the UKRBA framework and what accreditation means", "a brief explanation of the UKRBA framework, what accreditation means, and how they will be accredited once they activate their main plan (e.g. the £59 plan)");
    }

    for (const [key, value] of Object.entries(data)) {
        finalPrompt = finalPrompt.replace(new RegExp(`{${key}}`, 'g'), value || 'Not provided');
    }

    if (data.isFivePoundPlan) {
        finalPrompt += `
=========================================
PRE-ACCREDITATION & TONAL RULES (CRITICAL OVERRIDE):
1. NO ACTIVE ACCREDITATION: Do not write anywhere in the report that the accreditation has been granted, awarded, achieved, or is active.
2. FUTURE TONE ONLY: The tone must be "You will be accredited" or "The organization will be accredited" at Level ${level} upon activating their main subscription plan (such as the £59 plan).
3. USE PENDING/PROJECTED TERMINOLOGY: Refer to the status as "Projected Accreditation Level", "Pending Activation", or "Qualified for Level ${level}".
4. DO NOT USE "has been awarded" or "is accredited" or "has achieved". Instead, use "qualifies for", "will be awarded upon subscription activation", "is projected to be accredited at".
=========================================
`;
    }

    finalPrompt += STRICT_RULES;


    let attempts = 0;
    let content = null;
    const maxAttempts = 8;
    let modelToUse = 'claude-sonnet-4-6';
    
    while (attempts < maxAttempts && !content) {
        try {
            content = await callClaude(finalPrompt, modelToUse);
        } catch (e) {
            attempts++;
            const errorMsg = e.message || String(e);
            
            if (attempts === 3 && modelToUse === 'claude-sonnet-4-6') {
                log(`⚠️ Sonnet is struggling (Error: ${errorMsg}). Switching to Fallback Model (Haiku 4.5) for Master Report...`);
                modelToUse = 'claude-haiku-4-5-20251001';
            } else if (attempts === 5 && modelToUse === 'claude-haiku-4-5-20251001') {
                log(`⚠️ Claude Haiku 4.5 is struggling (Error: ${errorMsg}). Switching to older high-availability Fallback Model (Claude 3.5 Haiku) for Master Report...`);
                modelToUse = 'claude-3-5-haiku-20241022';
            }
            
            const waitTime = attempts * 5000; 
            log(`⚠️ Claude ${modelToUse} Error: ${errorMsg}. Retry ${attempts}/${maxAttempts} in ${waitTime/1000}s...`);
            if (attempts >= maxAttempts) break; 
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    if (!content) throw new Error("Failed to generate Master Report content after multiple attempts.");

    const pdfBuffer = await generateFullReportPdf(data, content);
    const pdfUrl = savePdf(pdfBuffer, 'Master_Assessment_Report');
    
    log(`✅ Finished: Master Assessment Report`);

    // 3. Generate Certificate and Membership Certificate ONLY for Full Members (and NOT for £5 plan users)
    let certificateUrl = null;
    let membershipCertificateUrl = null;
    if (isMember && !data.isFivePoundPlan) {
        log(`Generating Accreditation Certificate (Level ${level}) for ${data.businessName}...`);
        const certBuffer = await generateCertificatePdf(data, level);
        certificateUrl = savePdf(certBuffer, 'Accreditation_Certificate');
        log(`✅ Finished: Accreditation Certificate`);

        log(`Generating Membership Certificate (Level ${level}) for ${data.businessName}...`);
        const membershipCertBuffer = await generateMembershipCertificatePdf(data, level);
        membershipCertificateUrl = savePdf(membershipCertBuffer, 'Membership_Certificate');
        log(`✅ Finished: Membership Certificate`);
    }

    return {
        level: level,
        badgeUrl: data.isFivePoundPlan ? null : badgeUrl,
        downloadUrl: pdfUrl,
        certificateUrl: certificateUrl,
        membershipCertificateUrl: membershipCertificateUrl,
        title: 'Master Assessment Report'
    };
}

/**
 * NEW: Generates a single policy on-demand (for Dashboard buttons)
 */
export async function generateSingleAsset(data, assetId, log = console.log) {
    log(`Generating Single Asset: ${assetId} for ${data.businessName || data.title}`);

    const policy = PAID_POLICIES.find(p => p.id === assetId);
    if (!policy) throw new Error(`Policy ID ${assetId} not found.`);

    // Normalize naming for the prompt placeholders (mapping Wix keys to Prompt keys)
    const normalizedData = { ...data };
    
    // Capitalize business name if it's lowercase
    let bName = data.businessName || data.business_name || data.title || "Our Business";
    if (bName && typeof bName === 'string') {
        bName = bName.charAt(0).toUpperCase() + bName.slice(1);
    }
    normalizedData.business_name = bName;
    data.businessName = bName; // Update original for the PDF header
    
    normalizedData.company_url = data.companyUrl || data.company_url || data.url || "Not provided";
    normalizedData.business_description = data.businessDescription || data.business_description || data.describeBusiness || "A professional services provider.";
    normalizedData.industry = data.industry || data.q4 || "Not specified";
    normalizedData.employee_count_band = data.employee_count_band || data.q5 || "Not specified";
    normalizedData.business_size = data.businessSize || data.business_size || data.q6 || "Not specified";
    
    // Fill in placeholders in the prompt
    let finalPrompt = policy.prompt;
    for (const [key, value] of Object.entries(normalizedData)) {
        const val = (value === undefined || value === null || value === "") ? "Not provided" : value;
        finalPrompt = finalPrompt.replace(new RegExp(`{${key}}`, 'g'), val);
    }
    finalPrompt += STRICT_RULES;


    // Use Claude Haiku 4.5 for speed, but fallback to Claude 3.5 Haiku if overloaded/rate-limited
    let attempts = 0;
    let content = null;
    const maxAttempts = 5;
    let modelToUse = 'claude-haiku-4-5-20251001';

    while (attempts < maxAttempts && !content) {
        try {
            content = await callClaude(finalPrompt, modelToUse);
        } catch (e) {
            attempts++;
            const errorMsg = e.message || String(e);
            log(`⚠️ Claude ${modelToUse} Error during single asset generation: ${errorMsg}. Attempt ${attempts}/${maxAttempts}`);
            
            if (attempts === 2 && modelToUse === 'claude-haiku-4-5-20251001') {
                log(`⚠️ Switching to fallback model (Claude 3.5 Haiku) for single asset...`);
                modelToUse = 'claude-3-5-haiku-20241022';
            }
            
            if (attempts >= maxAttempts) break;
            const waitTime = attempts * 2000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    if (!content) {
        throw new Error(`Failed to generate Single Asset ${assetId} after ${maxAttempts} attempts.`);
    }

    const pdfBuffer = await generatePolicyPdf(data, policy.title, content);
    
    const fileId = crypto.randomBytes(8).toString('hex');
    const filename = `${assetId}_${fileId}.pdf`;
    const filepath = path.join(process.cwd(), 'public', 'reports', filename);
    
    if (!fs.existsSync(path.join(process.cwd(), 'public', 'reports'))) {
        fs.mkdirSync(path.join(process.cwd(), 'public', 'reports'), { recursive: true });
    }
    
    fs.writeFileSync(filepath, pdfBuffer);
    
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
        : `http://localhost:${process.env.PORT || 3000}`;

    return {
        id: assetId,
        title: policy.title,
        url: `${baseUrl}/reports/${filename}`
    };
}
