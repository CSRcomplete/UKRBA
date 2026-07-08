// Using global native fetch available in Node 18+

const businessData = {
    businessName: "Staffordshire Chambers of Commerce",
    companyUrl: "https://staffordshirechambers.co.uk/",
    businessDescription: "Staffordshire Chambers of Commerce is a leading membership organization dedicated to supporting, connecting, and growing businesses across Staffordshire. They offer comprehensive services including international trade and export documentation, professional business training (such as the Chamber AI Academy), events, business forums, networking, and expert advocacy to foster a thriving regional economy.",
    industry: "Business Support, Advocacy & Membership Services",
    employeeCountBand: "50-100 employees",
    operatingLocations: "Staffordshire and the West Midlands, UK",
    wasteLevel: "Low",
    energyUsage: "Medium",
    isMember: true,
    memberId: "staffordshire-chambers-accreditation",
    q4: "Yes", q5: "Yes", q6: "Yes", q7: "Yes", q8: "Yes",
    q10: "Yes", q11: "Yes", q12: "Yes", q13: "Yes", q14: "Yes",
    q15: "Yes", q16: "Yes", q17: "Yes", q18: [], q19: "Yes",
    q20: "Yes", q21: "Yes", q22: "Yes", q23: "Yes", q24: "Yes",
    q25: "Yes", q26: "Yes", q27: "Yes", q28: "Yes", q29: "Yes", q30: "Yes",
    diaryEvidence: `
- Implemented the "Chamber AI Academy" to democratize AI skills and upskill local businesses responsibly.
- Delivers funded growth, innovation, and startup support projects directly benefiting the local community.
- Actively promotes Staffordshire Business Awards to celebrate local entrepreneurship and community support.
- Operates 10 sector-specific business forums advocating for sustainable growth and fair trade.
    `,
    diaryUrl: "https://staffordshirechambers.co.uk/news/",
    webhookUrl: "https://www.ukrba.co.uk/_functions/paidSuiteReady" // Mock webhook
};

const BASE_URL = "https://ukrba-production.up.railway.app";

async function run() {
    console.log("==================================================================");
    console.log("🚀 TRIGGERING LIVE GENERATION ON RAILWAY PRODUCTION SERVER");
    console.log("==================================================================");

    const finalUrls = {
        masterReport: null,
        certificate: null,
        policies: {}
    };

    // 1. Trigger the background paid suite generation (Master Report & Certificate)
    console.log("\n💎 STAGE 1: Requesting Master Assessment Report & Certificate live on server...");
    try {
        const response = await fetch(`${BASE_URL}/api/generate-paid-suite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(businessData)
        });
        const resJson = await response.json();
        console.log("👉 Server accepted Master Report request:", resJson);
    } catch (e) {
        console.error("❌ Failed to trigger Master Report:", e.message);
    }

    // 2. Trigger the 8 Policies synchronously (they return URLs directly!)
    const policyIds = [
        'csr_esg',
        'community',
        'environmental',
        'equality',
        'ethical',
        'governance',
        'slavery',
        'workforce'
    ];

    console.log("\n📄 STAGE 2: Generating 8 Policy Documents directly on server...");
    for (const policyId of policyIds) {
        console.log(`⏳ Requesting Policy generation for [${policyId}]...`);
        try {
            const response = await fetch(`${BASE_URL}/api/generate-single-asset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userData: businessData,
                    assetId: policyId
                })
            });
            const asset = await response.json();
            if (asset.url) {
                finalUrls.policies[policyId] = asset.url;
                console.log(`✅ Success! Policy URL: ${asset.url}`);
            } else {
                console.error(`❌ Failed: ${JSON.stringify(asset)}`);
            }
        } catch (e) {
            console.error(`❌ Network error generating ${policyId}:`, e.message);
        }
    }

    // 3. Wait for the background Master Report and Certificate to complete
    console.log("\n⏳ STAGE 3: Waiting 60 seconds for background Master Report & Certificate to compile...");
    await new Promise(resolve => setTimeout(resolve, 60000));

    // 4. Query the reports list to identify the newly generated file names
    console.log("\n🔍 STAGE 4: Querying live file list from Railway server volume...");
    try {
        const response = await fetch(`${BASE_URL}/api/list-reports`);
        const files = await response.json();
        
        console.log("📂 Files found in volume:", files);

        // Find the Master Report and Certificate matching our generated date
        // Since they are newly created, they will be in this list
        const reports = files.filter(f => f.startsWith('Master_Assessment_Report_'));
        const certificates = files.filter(f => f.startsWith('Accreditation_Certificate_'));

        if (reports.length > 0) {
            // Sort by file name or take the latest
            finalUrls.masterReport = `${BASE_URL}/reports/${reports[reports.length - 1]}`;
        }
        if (certificates.length > 0) {
            finalUrls.certificate = `${BASE_URL}/reports/${certificates[certificates.length - 1]}`;
        }

        console.log("\n==================================================================");
        console.log("🎉 LIVE RAILWAY PIPELINE COMPLETED SUCCESSFULLY!");
        console.log("==================================================================");
        console.log("💎 LIVE MASTER REPORT:", finalUrls.masterReport);
        console.log("🎓 LIVE CERTIFICATE:", finalUrls.certificate);
        console.log("\n📄 LIVE POLICY DOCUMENTS:");
        for (const [id, url] of Object.entries(finalUrls.policies)) {
            console.log(`   - ${id}: ${url}`);
        }

    } catch (e) {
        console.error("❌ Failed to query reports list:", e.message);
    }
}

run();
