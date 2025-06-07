import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function pinterest(sock, msg, from) {
    // Safely get the message text, checking multiple possible locations
    const messageText = msg.message?.conversation || // For plain text messages
                        msg.message?.extendedTextMessage?.text || // For replies or messages with mentions/links
                        msg.message?.imageMessage?.caption || // For images with captions
                        ''; // Default to empty string if no text is found

    const args = messageText.split(' ').slice(1);

    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: !pinterest <search_query>\nExample: !pinterest nature wallpaper' });
        return;
    }

    const query = args.join(' ');

    try {
        await sock.sendMessage(from, { text: '🔍 Searching Pinterest images, please wait...' });

        // IMPORTANT: The hardcoded cookie you have will likely expire very quickly
        // and needs to be updated manually or you need a way to dynamically fetch it.
        // For a stable bot, you might need a different Pinterest API or strategy.
        const response = await axios.get(`https://id.pinterest.com/search/pins/?autologin=true&q=${encodeURIComponent(query)}`, { // Use encodeURIComponent for query
            headers: {
                'cookie': "_auth=1; _b=\"AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=\"; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9SNFNhVWJRWjRJK3pGMFA4Q3UvcHBnWHdaYXZpa2FUNkx6Z3RNQjEzTFJEOHZoaHRvazc1c1UrYlRuUmdKcDg3ZEY4cjNtZlBLRTRBZjNYK0lPTXZJTzQ5dUJybDdVS015bWJKT0tjTWYyRlBzclpiamdsNmtpeUZnRjlwVGJXUmdOMXdTUkFHRWloVjBMR0JlTE5YcmhxVHdoNzFHbDZ0YmFHZ1VLQXU1QnpkM1FqUTNMTnhYb3VKeDVGbnhNSkdkNXFSMXQybjRGL3pyZXRLR0ZTc0xHZ0JvbTJCNnAzQzE0cW1WTndIK0trY05HV1gxS09NRktadnFCSDR2YzBoWmRiUGZiWXFQNjcwWmZhaDZQRm1UbzNxc21pV1p5WDlabm1UWGQzanc1SGlrZXB1bDVDWXQvUis3elN2SVFDbm1DSVE5Z0d4YW1sa2hsSkZJb1h0MTFpck5BdDR0d0lZOW1Pa2RDVzNySWpXWmUwOUFhQmFSVUpaOFQ3WlhOQldNMkExeDIvMjZHeXdnNjdMYWdiQUhUSEFBUlhUVTdBMThRRmh1ekJMYWZ2YTJkNlg0cmFCdnU2WEpwcXlPOVZYXGNhNkZDd051S3lGZmo0eHV0ZE42NW8xRm5aRWpoQnNKNnNlSGFad1MzOHNkdWtER0xQTFN5Z3lmRERsZnZWWE5CZEJneVRlMDd2VmNPMjloK0g5eCswZUVJTS9CRkFweHc5RUh6K1JocGN6clc1JmZtL3JhRE1sc0NMTFlpMVErRGtPcllvTGdldz0=; _ir=0"
            }
        });

        const $ = cheerio.load(response.data);
        const imageUrls = [];
        const results = [];

        // Selecting all image sources found under div > a (Pinterest often loads images dynamically)
        // Pinterest's HTML structure can change, making this selector fragile.
        $("img[src]").each((i, element) => {
            const imgSrc = $(element).attr("src");
            // Only add Pinterest image URLs, usually containing 'i.pinimg.com'
            if (imgSrc && imgSrc.includes('i.pinimg.com')) {
                imageUrls.push(imgSrc);
            }
        });
        
        // Filter out undefined and replace resolution
        imageUrls.forEach(url => {
            if (url !== undefined) {
                // Pinterest often serves smaller images (e.g., /236x/)
                // Replacing /236x/ with /736x/ (or 'originals/' for highest quality)
                // might give better resolution, but '736x' is usually a good balance.
                results.push(url.replace(/\/\d+x\//g, '/736x/'));
            }
        });

        // The original code had results.shift() and random selection.
        // Let's refine this to get a set of unique random images.
        if (results.length === 0) {
            await sock.sendMessage(from, { text: '❌ No images found for your search query.' });
            return;
        }

        const sentUrls = new Set(); // To store URLs already sent
        const maxImagesToSend = Math.min(5, results.length);
        
        for (let i = 0; i < maxImagesToSend; i++) {
            let randomIndex;
            let imageUrl;
            let attempts = 0;
            const maxAttempts = results.length * 2; // Prevent infinite loop on small result sets

            do {
                randomIndex = Math.floor(Math.random() * results.length);
                imageUrl = results[randomIndex];
                attempts++;
            } while (sentUrls.has(imageUrl) && attempts < maxAttempts);

            if (sentUrls.has(imageUrl) && attempts >= maxAttempts) {
                console.log("Could not find enough unique images to send.");
                break; // Stop if we can't find unique images
            }

            sentUrls.add(imageUrl); // Mark as sent

            try {
                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: `📌 Pinterest Result ${i + 1}/${maxImagesToSend}\nQuery: ${query}`
                });
            } catch (sendError) {
                console.error(`Error sending image ${i + 1} (${imageUrl}):`, sendError);
                await sock.sendMessage(from, { text: `⚠️ Failed to send one of the images. Link: ${imageUrl}` });
            }
        }

    } catch (error) {
        console.error('Pinterest error:', error);
        // Provide more specific error messages to the user if possible
        let errorMessage = '❌ Error searching Pinterest. Please try again.';
        if (error.response) {
            errorMessage += ` (HTTP Status: ${error.response.status})`;
            if (error.response.status === 403) {
                errorMessage += `\n💡 This might be due to an expired or invalid Pinterest cookie.`;
            }
        } else if (error.request) {
            errorMessage += ` (No response from server. Network issue?)`;
        } else {
            errorMessage += ` (Message: ${error.message})`;
        }
        await sock.sendMessage(from, { text: errorMessage });
    }
}

pinterest.description = "Search for images on Pinterest";
pinterest.emoji = "📌";