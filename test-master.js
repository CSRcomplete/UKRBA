import { PAID_POLICIES } from './paid-prompts.js';
import { callClaude } from './ai-engine.js';
import { generateFullReportPdf } from './pdf-generator.js';
import fs from 'fs';
import path from 'path';

async function testSingleMasterReport() {
    const data = {
        businessName: "Eco Logistics UK",
        industry: "Sustainable Transport",
        businessDescription: "A fleet-based logistics provider using zero-emission vehicles for urban delivery.",
        companyUrl: "https://example-logistics.co.uk",
        employeeCountBand: "150 employees",
        operatingLocations: "Main hub in East London, with distribution across the M25.",
        overallPosition: "Highest Level Practice, Embedded Responsible Governance",
        level: 5,
        assessmentDate: "06 May 2026",
        diaryUrl: "https://csrcomplete.co.uk/diary/eco-logistics",
        diaryEvidence: `
            - March 2026: Transitioned 40% of delivery fleet to electric vans, saving 12 tons of CO2.
            - Jan 2026: Donated £5,000 to London Wildlife Trust and volunteered 120 staff hours for river cleanup.
            - Dec 2025: Implemented "Living Wage" for all warehouse staff and contractors.
        `
    };

    console.log("💎 Testing the MASTER ASSESSMENT REPORT (8 Pages)...");
    const masterPolicy = PAID_POLICIES.find(p => p.id === 'master-report');
    
    let finalPrompt = masterPolicy.prompt;
    for (const [key, value] of Object.entries(data)) {
        finalPrompt = finalPrompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    try {
        let content = await callClaude(finalPrompt);
        
        // Safety: Replace common placeholders if Claude left them in brackets
        content = content.replace(/\[Business Name\]/gi, data.businessName);
        content = content.replace(/\[Organisation Name\]/gi, data.businessName);
        content = content.replace(/\[Organisation\]/gi, data.businessName);
        content = content.replace(/\[DATE\]/gi, new Date().toLocaleDateString('en-GB'));
        content = content.replace(/\[X\]/gi, data.level.toString());

        const pdfBuffer = await generateFullReportPdf(data, content);
        const filename = `TEST_Master_Report.pdf`;
        const filepath = path.join(process.cwd(), 'public', 'reports', filename);
        
        fs.writeFileSync(filepath, pdfBuffer);
        console.log("✅ SUCCESS! Master Report Generated.");
        console.log("File saved at:", filepath);
    } catch (e) {
        console.error("❌ Error during Master Report test:", e);
    }
}

testSingleMasterReport();
