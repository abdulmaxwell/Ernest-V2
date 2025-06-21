// commands/ask.js

import axios from 'axios';

export default async function ask(sock, message, from, args) {
    const query = args.join(" ");

    if (!query) {
        await sock.sendMessage(from, { text: "Please provide a question for me to answer. E.g., `!ask What is the capital of France?`" });
        return;
    }

    await sock.sendMessage(from, { text: `Thinking about "${query}"...` });

    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            await sock.sendMessage(from, { text: "Error: Google Gemini API key is not configured in environment variables." });
            return;
        }

        // Gemini API Endpoint (using the 'generateContent' endpoint)
        // You might use gemini-pro, gemini-1.5-flash, gemini-1.5-pro depending on your needs and access.
        // gemini-pro is a good general-purpose model for chat.
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

        const data = {
            contents: [{
                parts: [{
                    text: query
                }]
            }],
            generationConfig: {
                maxOutputTokens: 500, // Limit the response length
                temperature: 0.7,    // Controls randomness. Lower for more factual, higher for more creative.
            },
            // safetySettings: [ // Optional: Configure safety settings if needed
            //     {
            //         category: "HARM_CATEGORY_HATE_SPEECH",
            //         threshold: "BLOCK_MEDIUM_AND_ABOVE"
            //     },
            //     // ... other categories
            // ]
        };

        console.log(`DEBUG: Making Google Gemini API request for query: "${query}"`);

        const response = await axios.post(geminiApiUrl, data);

        let answer = "Sorry, I couldn't get an answer for that right now.";
        if (response.data && response.data.candidates && response.data.candidates.length > 0) {
            // Gemini responses are structured with candidates and parts
            answer = response.data.candidates[0].content.parts[0].text.trim();
        } else if (response.data.promptFeedback && response.data.promptFeedback.blockReason) {
            // Handle cases where the prompt itself was blocked by safety settings
            answer = `Your request was blocked due to safety settings: ${response.data.promptFeedback.blockReason}`;
            console.warn(`Gemini blocked prompt: ${query} - Reason: ${response.data.promptFeedback.blockReason}`);
        }


        if (answer) {
            await sock.sendMessage(from, { text: answer });
            console.log(`DEBUG: Sent answer for "${query}".`);
        } else {
            await sock.sendMessage(from, { text: `I couldn't find a clear answer for "${query}". Please try rephrasing.` });
        }

    } catch (error) {
        console.error("⚠️ Error fetching answer from AI (Gemini):", error.response?.data || error.message);
        let errorMessage = "An error occurred while trying to get an answer. Please try again later.";

        if (error.response) {
            if (error.response.status === 400) {
                errorMessage = "Bad request to Gemini API. The query might be too long or malformed, or an invalid API key.";
            } else if (error.response.status === 403) {
                 errorMessage = "Gemini API Forbidden. Check your API key or project permissions.";
            } else if (error.response.status === 429) {
                errorMessage = "Gemini API rate limit exceeded or quota reached. Please try again in a moment.";
            } else if (error.response.status >= 500) {
                errorMessage = "The Gemini service is currently unavailable. Please try again later.";
            }
        } else if (error.code === 'ENOTFOUND' || error.code === 'ERR_NETWORK') {
            errorMessage = "Could not reach the Gemini service. Please check your internet connection.";
        }

        await sock.sendMessage(from, { text: errorMessage });
    }
}

export const description = "Asks a question to the AI (Google Gemini) and gets an answer.";
export const category = "AI";