import fs from 'fs';
import path from 'path';

const BASE_URL = "https://csr-complete-backend-production.up.railway.app";
const LOCAL_SUMMARY_PATH = path.join(process.cwd(), 'public', 'reports', 'staffordshire_chambers_suite.json');

async function run() {
    console.log("==================================================================");
    console.log("🚀 STARTING DOCKER VOLUME UPLOAD PIPELINE FOR STAFFORDSHIRE CHAMBERS");
    console.log("==================================================================");

    // 1. Wait for 60 seconds to ensure the new deployment containing the upload endpoint is active on Railway
    console.log("\n⏳ Waiting 50 seconds for Railway deployment to go active...");
    await new Promise(resolve => setTimeout(resolve, 50000));

    if (!fs.existsSync(LOCAL_SUMMARY_PATH)) {
        console.error("❌ ERROR: Local compilation summary not found at:", LOCAL_SUMMARY_PATH);
        process.exit(1);
    }

    const localSuite = JSON.parse(fs.readFileSync(LOCAL_SUMMARY_PATH, 'utf8'));
    const filesToUpload = [];

    // Master Report
    if (localSuite.masterReport) {
        const name = path.basename(localSuite.masterReport);
        filesToUpload.push({ name, key: 'Master Assessment Report' });
    }
    // Certificate
    if (localSuite.certificate) {
        const name = path.basename(localSuite.certificate);
        filesToUpload.push({ name, key: 'Accreditation Certificate' });
    }
    // Policies
    if (localSuite.policies && Array.isArray(localSuite.policies)) {
        localSuite.policies.forEach(p => {
            const name = path.basename(p.url);
            filesToUpload.push({ name, key: p.title });
        });
    }

    console.log(`\n📋 Found ${filesToUpload.length} documents to copy to live production volume.`);

    const liveUrls = {
        masterReport: null,
        certificate: null,
        policies: []
    };

    // 2. Upload each file to the live Railway server volume
    for (const file of filesToUpload) {
        const localFilePath = path.join(process.cwd(), 'public', 'reports', file.name);
        console.log(`\n⏳ Uploading [${file.key}] (${file.name})...`);

        if (!fs.existsSync(localFilePath)) {
            console.error(`❌ Local file not found: ${localFilePath}`);
            continue;
        }

        try {
            const fileBuffer = fs.readFileSync(localFilePath);
            const base64Data = fileBuffer.toString('base64');

            const response = await fetch(`${BASE_URL}/api/upload-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    base64Data: base64Data
                })
            });

            const resJson = await response.json();
            if (resJson.status === 'success') {
                const liveUrl = `${BASE_URL}${resJson.url}`;
                console.log(`✅ Success! Live URL: ${liveUrl}`);

                if (file.key === 'Master Assessment Report') {
                    liveUrls.masterReport = liveUrl;
                } else if (file.key === 'Accreditation Certificate') {
                    liveUrls.certificate = liveUrl;
                } else {
                    liveUrls.policies.push({
                        title: file.key,
                        url: liveUrl
                    });
                }
            } else {
                console.error("❌ Upload failed:", resJson.error);
            }
        } catch (e) {
            console.error("❌ Network error during upload:", e.message);
        }
    }

    console.log("\n==================================================================");
    console.log("🎉 ALL DOCUMENTS SUCCESSFULLY DEPLOYED TO PRODUCTION VOLUME!");
    console.log("==================================================================");
    console.log("💎 LIVE MASTER REPORT:\n   ", liveUrls.masterReport);
    console.log("🎓 LIVE CERTIFICATE:\n   ", liveUrls.certificate);
    console.log("\n📋 LIVE POLICY DOCUMENTS:");
    liveUrls.policies.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.title} -> ${p.url}`);
    });
    console.log("==================================================================\n");
}

run();
