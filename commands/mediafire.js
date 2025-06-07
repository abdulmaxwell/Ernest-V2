import axios from 'axios';
import * as cheerio from 'cheerio';

async function downloadFromMediafire(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                // Mimic a common web browser User-Agent
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                // MediaFire often checks the Referer to ensure it's coming from their own page
                'Referer': 'https://www.mediafire.com/' 
            }
        });
        const $ = cheerio.load(response.data);
        
        let downloadLink = $('a#downloadButton').attr('href');
        let filename = '';
        let fileSize = '';

        // MediaFire sometimes uses a different ID or data attribute for the download link,
        // or the link might be within a JavaScript variable.
        // It's crucial to inspect the specific MediaFire page's HTML/JS.
        // As a fallback, let's try to extract from other potential elements or JS.

        // If the direct downloadButton isn't found, check other common structures
        if (!downloadLink) {
            // This is a common pattern for the direct download link on MediaFire
            const directLinkScript = $('script:contains("var downloadUrl =")').html();
            if (directLinkScript) {
                const match = directLinkScript.match(/var downloadUrl = "(.*?)"/);
                if (match && match[1]) {
                    downloadLink = match[1];
                }
            }
        }
        
        // Also try to find filename and size from other elements if not found via downloadButton
        const filenameElement = $('.dl-btn-label'); // Common filename element
        if (filenameElement.length) {
            filename = filenameElement.text().trim();
        } else {
            // Fallback: try to get from the download link itself if already found
            if (downloadLink) {
                const urlParts = downloadLink.split('/');
                filename = urlParts[urlParts.length - 1] || 'unknown_file'; // Last part or generic name
            }
        }

        const sizeElement = $('.details .file-size'); // Common file size element
        if (sizeElement.length) {
            fileSize = sizeElement.text().trim();
        } else {
             // Fallback: try to get from the download button text itself
            const rawButtonText = $('a#downloadButton').text();
            if (rawButtonText) {
                fileSize = rawButtonText
                    .replace('Download', '')
                    .replace(/[()]/g, '')
                    .replace(/\n/g, '')
                    .trim();
            }
        }


        if (!downloadLink) {
            throw new Error('Download link not found. The MediaFire page structure might have changed or the link is invalid.');
        }

        // Extract file extension
        const fileExtension = filename.includes('.') ? filename.split('.').pop() : 'unknown';
        
        return {
            filename: filename,
            fileExtension: fileExtension,
            fileSize: fileSize,
            downloadUrl: downloadLink
        };
        
    } catch (error) {
        console.error('Error in downloadFromMediafire:', error.message);
        // Re-throw to be caught by the main mediafire command's try/catch
        if (error.response) {
            throw new Error(`Failed to process MediaFire URL. Status: ${error.response.status}. Message: ${error.message}`);
        } else {
            throw new Error(`Failed to process MediaFire URL: ${error.message}`);
        }
    }
}

export default async function mediafire(sock, msg, from) {
    try {
        // Get the message text
        const messageText = msg.message?.conversation || 
                            msg.message?.extendedTextMessage?.text || '';
        
        // Extract MediaFire URL from the message
        const args = messageText.split(' ');
        const mediafireUrl = args[1]; // Assumes command is ".mediafire <url>"
        
        // Validate if URL is provided
        if (!mediafireUrl) {
            await sock.sendMessage(from, { 
                text: '❌ Please provide a MediaFire URL!\n\n*Usage:* .mediafire <mediafire_url>\n\n*Example:* .mediafire https://www.mediafire.com/file/xxxxxx/filename.ext/file' 
            });
            return;
        }
        
        // Validate if it's a MediaFire URL
        if (!mediafireUrl.includes('mediafire.com')) {
            await sock.sendMessage(from, { 
                text: '❌ Please provide a valid MediaFire URL!' 
            });
            return;
        }
        
        // Send processing message
        await sock.sendMessage(from, { text: '🔄 Processing MediaFire link... Please wait.' });
        
        // Get download information
        const fileInfo = await downloadFromMediafire(mediafireUrl);
        
        // Create response message with file information
        const responseMessage = `📁 *MediaFire Download Info*\n\n` +
                                `📝 *Filename:* ${fileInfo.filename || 'N/A'}\n` +
                                `📊 *Size:* ${fileInfo.fileSize || 'N/A'}\n` +
                                `🗂️ *Type:* ${fileInfo.fileExtension.toUpperCase()}\n` +
                                `🔗 *Direct Link:* ${fileInfo.downloadUrl}\n\n` +
                                `✅ *Ready to download!*`;
        
        await sock.sendMessage(from, { text: responseMessage });
        
    } catch (error) {
        console.error('MediaFire command error:', error);
        await sock.sendMessage(from, { 
            text: `❌ Failed to process MediaFire link. ${error.message}\n\nPlease check if the URL is valid, the file still exists, or try again later.` 
        });
    }
}

mediafire.description = "Download files from MediaFire links";
mediafire.emoji = "📁";