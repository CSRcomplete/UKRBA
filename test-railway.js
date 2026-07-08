const NODE_SERVER_URL = "https://ukrba-production.up.railway.app";

async function testRailway() {
    const formData = {
        title: "Test Business",
        url: "https://example.com",
        describeBusiness: "A test business",
        namePolicyOwner: "Test Owner",
        webhookUrl: "https://www.ukrba.co.uk/_functions/reportReady", // Pinging their webhook
        email: "test@example.com", // This will trigger the invalid email error on their end, but we will see if the backend runs!
        q4: "Yes", q5: "Yes", q6: "Yes", q7: "Yes", q8: "Yes",
        q10: "Yes", q11: "Yes", q12: "Yes", q13: "Yes", q14: "Yes",
        q15: "Yes", q16: "Yes", q17: "No", q18: [], q19: "Yes",
        q20: "Yes", q21: "Yes", q22: "Yes", q23: "Yes", q24: "Yes",
        q25: "Yes", q26: "Yes", q27: "Yes", q28: "Yes", q29: "Yes", q30: "Yes"
    };

    console.log("Sending request to Railway...");
    try {
        const response = await fetch(`${NODE_SERVER_URL}/api/generate-free-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}

testRailway();
