async function testFivePoundReport() {
    const url = "http://localhost:3000/api/submit-form";
    const body = {
        businessName: "The Artisanal Bakery",
        industry: "Food & Beverage",
        businessDescription: "A local organic bakery focused on sustainable ingredients and community engagement.",
        companyUrl: "https://artisanalbakery.co.uk",
        isMember: true, // Now all reports are paid (member) under UKRBA
        webhookUrl: "https://www.ukrba.co.uk/_functions/testWebhook",
        q1: "Yes", q5: "Yes", q10: "Yes", q15: "Yes", q20: "Yes" // Some yes answers to get a level
    };

    console.log(`🚀 Triggering UKRBA Paid Assessment for: ${body.businessName}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        console.log("✅ Server Accepted Request:", data);
        console.log("⏳ The report is being generated in the background. Check server logs for progress.");
    } catch (e) {
        console.error("❌ Error triggering test:", e.message);
    }
}

testFivePoundReport();
