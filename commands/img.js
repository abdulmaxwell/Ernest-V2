// commands/img.js

import axios from 'axios';

// Remove the Baileys imports from here, as they are handled in messageHandler if needed globally
// (though axios is still needed for this specific command)

export default async function img(sock, message, from, args) { // 'from' is now directly passed
    // const remoteJid = message.key.remoteJid; // No need to re-extract, 'from' is already the remoteJid
    const query = args.join(" ");

    if (!query) {
        await sock.sendMessage(from, { text: "Please provide a search query for images. E.g., `!img cats`" }); // Using 'from'
        return;
    }

    // You can keep this initial message if you like, it provides immediate feedback
    await sock.sendMessage(from, { text: `Searching for images of "${query}"...` });

    // --- REMOVE THESE from the command itself as messageHandler handles it ---
    // await sock.sendPresenceUpdate('composing', from);
    // console.log(`DEBUG: Sent 'composing' presence to ${from}.`);
    // --------------------------------------------------------------------------

    try {
        let imageUrl = null;
        let caption = `Image for "${query}"`;

        const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
        const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX;

        if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) {
            await sock.sendMessage(from, { text: "Error: Google Custom Search API key or CX is not configured in environment variables." });
            return;
        }

        const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=1`;
        
        console.log(`DEBUG: Making Google CSE request: ${googleSearchUrl}`); // For debugging

        const response = await axios.get(googleSearchUrl);
        const items = response.data.items;

        if (items && items.length > 0) {
            imageUrl = items[0].link;
        } else {
            await sock.sendMessage(from, { text: `No images found on Google for "${query}". Please try a different query.` });
            return;
        }

        if (imageUrl) {
            await sock.sendMessage(from, { // Using 'from' here
                image: { url: imageUrl },
                caption: caption
            });
            console.log(`DEBUG: Sent image: ${imageUrl}`); // For debugging
        } else {
            await sock.sendMessage(from, { text: `Sorry, I couldn't get an image for "${query}".` });
        }

    } catch (error) {
        console.error("⚠️ Error fetching images:", error.response?.data || error.message);
        let errorMessage = "An error occurred while trying to get images. Please try again later.";
        
        if (error.response && error.response.status === 403) {
            errorMessage = "Authentication error with the image API. Please check your API key and its restrictions, or your daily quota.";
        } else if (error.response && error.response.status === 400) {
            errorMessage = "Bad request to image API. Please check your query or Custom Search Engine ID.";
        } else if (error.code === 'ENOTFOUND' || error.code === 'ERR_NETWORK') {
            errorMessage = "Could not reach the image search service. Please check your internet connection.";
        }

        await sock.sendMessage(from, { text: errorMessage });

    } finally {
        // --- REMOVE THIS from the command itself as messageHandler handles it ---
        // await sock.sendPresenceUpdate('paused', from);
        // console.log(`DEBUG: Sent 'paused' presence to ${from} (command finished).`);
        // --------------------------------------------------------------------------
    }
}

export const description = "Searches for images based on your query using Google Custom Search.";
export const category = "Images";

// If your framework auto-attaches, these might be redundant but good for clarity
img.description = "Searches for images based on your query using Google Custom Search.";
 img.category = "Images";