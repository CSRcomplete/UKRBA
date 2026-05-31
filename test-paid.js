async function testPaidSuite() {
    const url = "http://localhost:3000/api/generate-paid-suite";
    const body = {
        businessName: "Eco Logistics UK",
        industry: "Transport & Logistics",
        businessDescription: "A leading green logistics firm providing zero-emission last-mile delivery services across London.",
        companyUrl: "https://example-logistics.co.uk",
        employeeCountBand: "50-100",
        operatingLocations: "London and South East",
        wasteLevel: "Low",
        energyUsage: "High (Electric Fleet)",
        memberId: "test-paid-user-001",
        webhookUrl: "https://www.csrcomplete.co.uk/_functions/paidSuiteReady" // Mock webhook
    };

    console.log("🚀 Triggering Paid Suite Generation...");
    console.log("NOTE: This will take 3-5 minutes as Claude writes 10,000+ words across 8 documents.");

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        console.log("✅ Server Accepted Request:", data);
        console.log("Check the terminal logs to see the live generation progress...");
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

testPaidSuite();
