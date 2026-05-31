import dotenv from 'dotenv';
dotenv.config();

export async function generateAI(systemPrompt, userData, reportKey) {
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
        throw new Error("CLAUDE_API_KEY is not set in the environment.");
    }

    const body = {
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{
            role: "user",
            content: `Generate report for: ${userData.title || userData.businessName || 'Business'}. Data: ${JSON.stringify(userData)}`
        }]
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();

    // ERROR CHECK: If Claude returns an error (e.g., 401, 400), log it properly
    if (result.error) {
        console.error("Claude API Error Type:", result.error.type);
        console.error("Claude API Error Message:", result.error.message);
        throw new Error(`Claude API: ${result.error.message}`);
    }

    // Safety check before accessing the array
    if (!result.content || !result.content[0]) {
        console.error("Unexpected API Response Structure:", result);
        throw new Error("AI response was empty or malformed.");
    }

    let rawText = result.content[0].text;
    
    // Extract the JSON object from the response (Claude might add some conversational padding despite strict instructions)
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        rawText = rawText.substring(firstBrace, lastBrace + 1);
    }

    return rawText;
}

/**
 * Raw text generation for Policies
 */
export async function callClaude(prompt, model = "claude-haiku-4-5") {
    const apiKey = process.env.CLAUDE_API_KEY;
    const body = {
        model: model,
        max_tokens: 4000,
        messages: [{
            role: "user",
            content: prompt
        }]
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();
    if (result.error) throw new Error(`Claude API: ${result.error.message}`);
    return result.content[0].text;
}
