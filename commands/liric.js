import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function lirik(sock, msg, from) {
    // Safely get the message text, checking multiple possible locations
    const messageText = msg.message?.conversation || // For plain text messages
                        msg.message?.extendedTextMessage?.text || // For replies or messages with mentions/links
                        msg.message?.imageMessage?.caption || // For images with captions (though less likely for lirik)
                        ''; // Default to empty string if no text is found

    const args = messageText.split(' ').slice(1); // Now msg.body is replaced by messageText

    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: !lirik <song_name>\nExample: !lirik imagine dragons believer' });
        return;
    }
    
    const query = args.join(' ');
    
    try {
        await sock.sendMessage(from, { text: '🎵 Searching for song lyrics, please wait...' });

        // Musixmatch often requires a User-Agent to avoid blocking
        const searchResponse = await axios.get(`https://www.musixmatch.com/search/${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive'
            }
        });
        const $ = cheerio.load(searchResponse.data);
        
        const result = {};
        // More robust selector for song URL, as Musixmatch's structure can vary
        // Targeting the first search result link that looks like a song page
        const songUrlElement = $("a.title[href*='/lyrics/']").first();
        const songUrl = songUrlElement ? "https://www.musixmatch.com" + songUrlElement.attr('href') : null;
        
        if (!songUrl) { // Check for null or empty string
            await sock.sendMessage(from, { text: '❌ No lyrics found for your search query.' });
            return;
        }

        // Fetch lyrics page
        const lyricsResponse = await axios.get(songUrl, {
            headers: {
                'User-Agent': 'Mozilla/55.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Referer': songUrl // Set referer to the search page or previous page
            }
        });
        const $lyrics = cheerio.load(lyricsResponse.data);
        
        // Extract thumbnail if available
        result.thumb = null; // Default to null
        const thumbElement = $lyrics("img.responsive-img[src*='images.genius.com']"); // Adjust selector if needed
        if (thumbElement.length) {
            result.thumb = thumbElement.attr("src");
            // Ensure it's a full URL, sometimes it's relative
            if (result.thumb && result.thumb.startsWith('//')) {
                result.thumb = 'https:' + result.thumb;
            } else if (result.thumb && !result.thumb.startsWith('http')) {
                 // If it's a relative path on musixmatch, reconstruct
                 // This is unlikely for external image hosts like genius, but good for robustness
                result.thumb = `https://www.musixmatch.com${result.thumb}`;
            }
        }


        // Extract lyrics - Musixmatch's lyric structure is very complex and dynamic.
        // It often uses `data-lyrics-content` attributes or nested `span` elements.
        // The current selector might be too fragile.
        // Let's try to get all relevant lyric lines.
        let lyricsLines = [];
        $lyrics('.lyrics__content__okm').each((i, el) => {
            $(el).find('span.lyrics__content__okm').each((j, spanEl) => {
                const line = $(spanEl).text().trim();
                if (line) {
                    lyricsLines.push(line);
                }
            });
        });
        // Fallback for older structures or different displays if above fails
        if (lyricsLines.length === 0) {
            $lyrics('div.mxm-lyrics span[class^="lyrics__content"]').each((i, el) => {
                const line = $(el).text().trim();
                if (line) {
                    lyricsLines.push(line);
                }
            });
        }
        // Another common pattern for lyric lines
        if (lyricsLines.length === 0) {
            $lyrics('.lyrics-content > p > span').each((i, el) => {
                const line = $(el).text().trim();
                if (line) {
                    lyricsLines.push(line);
                }
            });
        }
         if (lyricsLines.length === 0) {
            $lyrics('.lyrics-content > div[data-lyrics-content]').each((i, el) => {
                const line = $(el).text().trim();
                if (line) {
                    lyricsLines.push(line);
                }
            });
        }

        result.lirik = lyricsLines.join('\n'); // Join all lines with newlines

        if (!result.lirik || result.lirik.trim() === "") {
            await sock.sendMessage(from, { text: '❌ Could not extract lyrics for this song. Musixmatch page structure might have changed, or lyrics are not available.' });
            return;
        }

        // Split lyrics if too long (WhatsApp message limit is approx. 4096 characters)
        const maxLength = 3500; // Leave some buffer for caption/header
        let message = `🎵 *Song Lyrics*\nQuery: *${query}*\n\n${result.lirik}`;
        
        if (message.length > maxLength) {
            // Split into chunks
            const chunks = [];
            // Start with header for each chunk
            let currentChunk = `🎵 *Song Lyrics*\nQuery: *${query}*\n\n`; 
            const lyricsLines = result.lirik.split('\n');
            
            for (const line of lyricsLines) {
                if ((currentChunk + line + '\n').length > maxLength) {
                    chunks.push(currentChunk);
                    currentChunk = line + '\n'; // Start new chunk with the current line
                } else {
                    currentChunk += line + '\n';
                }
            }
            
            if (currentChunk.trim()) {
                chunks.push(currentChunk);
            }
            
            // Send chunks
            for (let i = 0; i < chunks.length; i++) {
                await sock.sendMessage(from, { text: `${chunks[i]}\n\n(Part ${i + 1}/${chunks.length})` }); // Added part indicator
            }
        } else {
            // Send with thumbnail if available and not too long
            if (result.thumb) { // Check if thumb is not null/undefined
                try {
                    await sock.sendMessage(from, {
                        image: { url: result.thumb },
                        caption: message
                    });
                } catch (error) {
                    console.error("Error sending image with lyrics:", error);
                    await sock.sendMessage(from, { text: message }); // Send text only if image fails
                }
            } else {
                await sock.sendMessage(from, { text: message });
            }
        }

    } catch (error) {
        console.error('Lirik error:', error);
        let userErrorMessage = '❌ Error searching for lyrics. Please try again.';
        if (axios.isAxiosError(error)) {
            if (error.response) {
                userErrorMessage = `❌ Failed to fetch lyrics. Musixmatch returned status: ${error.response.status}. It might be blocking the request.`;
            } else if (error.request) {
                userErrorMessage = `❌ Network error while fetching lyrics. Please check your internet connection.`;
            }
        } else if (error.message.includes('No lyrics found') || error.message.includes('Could not extract lyrics')) {
            userErrorMessage = error.message; // Use the specific error message generated
        }
        await sock.sendMessage(from, { text: userErrorMessage });
    }
}

lirik.description = "Search for song lyrics";
lirik.emoji = "🎵";