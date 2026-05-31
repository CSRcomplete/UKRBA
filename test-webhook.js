

async function testWebhook() {
    const webhookUrl = "https://www.csrcomplete.co.uk/_functions/reportReady";
    const body = {
        downloadUrl: "https://example.com/dummy.pdf",
        email: "test@example.com"
    };

    console.log("Pinging webhook...");
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const responseText = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", responseText);
    } catch (e) {
        console.error("Error:", e);
    }
}

testWebhook();
