const { getAiResponse } = require('../src/services/aiService');

// The warning message as a constant
const WARNING_MESSAGE = `⚠️ NOTICE FROM ERNEST TECH HOUSE

Before we continue, please read this carefully:

📌 This AI is powered by a third-party API (not managed or owned by Ernest Tech House).  
🚫 DO NOT share any sensitive or private data (passwords, API keys, secrets, personal info).  
✅ Your message is processed externally and may be logged by the AI provider.

By continuing, you agree to use this AI responsibly.

Now processing your request... 🧠✨`;

export default async function gemini(sock, msg, from) {
    const prompt = msg.body.replace(/^\/gemini\s*/i, '').trim();
    if (!prompt) {
        await sock.sendMessage(from, { text: 'Please provide a prompt after the /gemini command. Example: /gemini Write a short poem about space.' });
        return;
    }

    // --- Send the Warning Message First ---
    await sock.sendMessage(from, { text: WARNING_MESSAGE });

    // --- Add a 2-second delay ---
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2000 milliseconds = 2 seconds

    await sock.sendMessage(from, { text: 'Thinking... (Gemini)' });

    try {
        const response = await getAiResponse('gemini', prompt);
        await sock.sendMessage(from, { text: response });
    } catch (error) {
        console.error("Error in /gemini command:", error);
        await sock.sendMessage(from, { text: 'An error occurred while trying to get a response from Gemini. Please try again later.' });
    }
}

gemini.description = "Get a response from Google Gemini.";
gemini.emoji = "✨";
gemini.category = "AI";