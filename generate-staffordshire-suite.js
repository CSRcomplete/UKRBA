import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { generatePaidSuite, generateSingleAsset } from './paid-engine.js';

dotenv.config();

// Ensure the CLAUDE_API_KEY is present
if (!process.env.CLAUDE_API_KEY) {
    console.error("❌ ERROR: CLAUDE_API_KEY is not defined in your .env file!");
    process.exit(1);
}

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
    // 25 "Yes" answers to ensure Level 5 Accreditation (>24 Yes count)
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
    diaryUrl: "https://staffordshirechambers.co.uk/news/"
};

async function runGenerationPipeline() {
    console.log("==================================================================");
    console.log("🚀 STARTING GENERATION PIPELINE FOR STAFFORDSHIRE CHAMBERS OF COMMERCE");
    console.log("==================================================================");
    console.log(`Company: ${businessData.businessName}`);
    console.log(`URL: ${businessData.companyUrl}`);
    console.log("Accreditation Target: Level 5");
    console.log("------------------------------------------------------------------");

    const results = {
        masterReport: null,
        certificate: null,
        policies: []
    };

    try {
        // 1. Generate Master Report and Certificate
        console.log("\n💎 STAGE 1: Generating Master Assessment Report & Certificate...");
        const masterSuite = await generatePaidSuite(businessData, console.log);
        results.masterReport = masterSuite.downloadUrl;
        results.certificate = masterSuite.certificateUrl;
        
        console.log("✅ Master Report URL:", results.masterReport);
        console.log("✅ Certificate URL:", results.certificate);

        // 2. Generate the 8 individual Policy Documents
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

        console.log("\n📄 STAGE 2: Generating 8 Policy Documents...");
        for (const policyId of policyIds) {
            console.log(`\n⏳ Generating Policy: [${policyId}]...`);
            const asset = await generateSingleAsset(businessData, policyId, console.log);
            results.policies.push({
                id: policyId,
                title: asset.title,
                url: asset.url
            });
            console.log(`✅ Finished policy: ${asset.title}`);
        }

        console.log("\n==================================================================");
        console.log("🎉 ALL CSR COMPLETE DOCUMENTS GENERATED SUCCESSFULLY!");
        console.log("==================================================================");
        
        // Print Summary to terminal
        console.log(`\n📂 Master Assessment Report:\n   ${results.masterReport}`);
        console.log(`🎓 Accreditation Certificate:\n   ${results.certificate}`);
        console.log("\n📋 Core Policy Documents:");
        results.policies.forEach((p, idx) => {
            console.log(`   ${idx + 1}. [${p.id}] ${p.title} -> ${p.url}`);
        });

        // Write a structured JSON metadata file in public/reports for safe-keeping
        const summaryPath = path.join(process.cwd(), 'public', 'reports', 'staffordshire_chambers_suite.json');
        fs.writeFileSync(summaryPath, JSON.stringify(results, null, 4));
        console.log(`\n💾 Saved compilation metadata to: ${summaryPath}\n`);

    } catch (error) {
        console.error("\n❌ PIPELINE ERROR:", error);
        process.exit(1);
    }
}

runGenerationPipeline();
