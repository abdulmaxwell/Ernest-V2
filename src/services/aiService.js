const axios = require('axios'); // Ensure axios is installed: npm install axios

// Base URL for your AI backend
const BASE_URL = 'https://apis.davidcyriltech.my.id';

async function getAiResponse(modelName, prompt) {
    let url = '';
    let queryParam = 'text'; // Default query parameter
    let responseKey = 'result'; // Default key to extract result from JSON

    // Map model names to their specific API paths and query parameters
    switch (modelName.toLowerCase()) {
        case 'gpt':
        case 'chatgpt':
            url = `${BASE_URL}/ai/chatbot`;
            queryParam = 'query'; // 'query' for chatbot
            break;
        case 'blackbox':
            url = `${BASE_URL}/blackbox`;
            queryParam = 'q'; // 'q' for blackbox
            break;
        case 'gemini':
            url = `${BASE_URL}/ai/gemini`;
            // queryParam remains 'text'
            break;
        default:
            throw new Error(`Unsupported AI model: ${modelName}. Only GPT, Blackbox, and Gemini are currently supported.`);
    }

    try {
        const fullUrl = `${url}?${queryParam}=${encodeURIComponent(prompt)}`;
        
        console.log(`Making request to: ${fullUrl}`); // For debugging

        const response = await axios.get(fullUrl);
        let result = response.data;

        // Check if the response is an object and has the expected key
        if (typeof result === 'object' && result !== null && result[responseKey]) {
            result = result[responseKey];
        } else if (typeof result === 'object' && result !== null && Object.keys(result).length === 0) {
            // If it's an empty object, treat as no valid response
            result = null;
        }
        // If it's already a string, or directly the expected result, use it as is.

        // --- Null/Empty Response Handling ---
        if (!result || (typeof result === 'string' && result.trim().toLowerCase() === 'null') || result.trim() === '') {
            return `The AI model "${modelName}" did not provide a valid response for your prompt. Please try again with a different prompt or model.`;
        }
        
        return result;

    } catch (error) {
        console.error(`Error interacting with ${modelName} (${url}) for prompt "${prompt}":`, error.message);
        
        let errorMessage = `An error occurred while getting a response from ${modelName}.`;

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('API Response Data:', error.response.data);
            console.error('API Response Status:', error.response.status);
            errorMessage += ` Status: ${error.response.status}. Details: ${error.response.data.message || JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            // The request was made but no response was received (e.g., network error)
            errorMessage += ` No response received from the API. It might be down or unreachable.`;
        } else {
            // Something happened in setting up the request that triggered an Error
            errorMessage += ` Internal error: ${error.message}`;
        }
        return errorMessage;
    }
}

module.exports = { getAiResponse };