import axios from "axios";
import fs from "fs/promises"; // Using fs/promises for async file operations
import FormData from "form-data";
import { tmpdir } from 'os';        // For temporary directory
import path from 'path';          // For path manipulation
import { randomBytes } from 'crypto'; // For generating unique file names

// Helper function for uploading to Shannz CDN
// Modified to throw errors on failure, making error handling in the command cleaner
async function uploadToShannzCdn(filePath) {
    const form = new FormData();
    // Use require('fs').createReadStream for streaming file upload with FormData
    // fs/promises doesn't export createReadStream directly, it's on the main 'fs' module.
    const fileStream = require('fs').createReadStream(filePath); 
    form.append("file", fileStream);

    try {
        const response = await axios.post("https://endpoint.web.id/server/upload", form, {
            headers: {
                ...form.getHeaders(),
            },
            // Important for large file uploads with Axios
            maxBodyLength: Infinity, 
            maxContentLength: Infinity,
        });

        // Assuming endpoint.web.id/server/upload returns a JSON object with a 'url' property on success
        if (response.data && response.data.url) {
            return response.data.url;
        } else {
            // If the API returns a success status but no expected URL
            throw new Error(`Unexpected CDN response: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            // Provide more specific error details from Axios response
            throw new Error(`CDN upload failed: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
        } else {
            // Catch any other general errors
            throw new Error(`CDN upload failed: ${error.message}`);
        }
    }
}

// WhatsApp Bot Command for Shannz CDN Upload
export default async function shannz(sock, msg, from) {
    let quotedMsg = msg.quoted || msg; // Check if it's a quoted message or the current message
    let mediaBuffer = null;
    let fileName = '';
    let mediaType = 'unknown';
    let tempFilePath = ''; // Declare here to ensure it's accessible in finally block

    try {
        // Determine if there's media in the message and download it
        // Use optional chaining for safe access to nested properties
        if (quotedMsg.message?.imageMessage) {
            mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
            mediaType = 'image';
            fileName = quotedMsg.message.imageMessage.fileName || `image_${randomBytes(4).toString('hex')}.jpeg`;
        } else if (quotedMsg.message?.videoMessage) {
            mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
            mediaType = 'video';
            fileName = quotedMsg.message.videoMessage.fileName || `video_${randomBytes(4).toString('hex')}.mp4`;
        } else if (quotedMsg.message?.documentMessage) {
            mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
            mediaType = 'document';
            fileName = quotedMsg.message.documentMessage.fileName || `document_${randomBytes(4).toString('hex')}.pdf`;
        } else if (quotedMsg.message?.stickerMessage) {
            mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
            mediaType = 'sticker';
            fileName = `sticker_${randomBytes(4).toString('hex')}.webp`; // Stickers are typically .webp
        }

        // If no media was found, send usage instructions
        if (!mediaBuffer) {
            await sock.sendMessage(from, { text: 
                '☁️ *Shannz CDN Uploader*\n\n' +
                '❌ No media found to upload. Please reply to an image, video, document, or sticker, or send one with the command.\n\n' +
                '*How to use:*\n' +
                '1️⃣ Reply to any media with `/shannz`\n' +
                '2️⃣ Send any media with the caption `/shannz`\n\n' +
                '*Features:*\n' +
                '• Free file hosting by endpoint.web.id\n' +
                '• Direct link to uploaded media\n' +
                '• Supports various media types (images, videos, documents, stickers)\n\n' +
                '💡 *Tip:* This service is external. Use responsibly. No guarantees on content retention.'
            });
            return;
        }

        // Save the downloaded media buffer to a temporary file
        const fileExtension = path.extname(fileName || '') || `.${mediaType === 'image' ? 'jpeg' : mediaType === 'video' ? 'mp4' : 'bin'}`;
        tempFilePath = path.join(tmpdir(), `${randomBytes(16).toString('hex')}${fileExtension}`);
        await fs.writeFile(tempFilePath, mediaBuffer);

        const fileSizeMB = (mediaBuffer.length / (1024 * 1024)).toFixed(2); // Calculate file size in MB

        // Send a "processing" message to the user
        await sock.sendMessage(from, { 
            text: `☁️ *Uploading to Shannz CDN...*\n\n` +
                  `📄 File: ${fileName || mediaType}\n` +
                  `📊 Type: ${mediaType.toUpperCase()}\n` +
                  `📦 Size: ${fileSizeMB} MB\n` +
                  `⏳ Please wait...`
        });

        // Perform the upload using the helper function
        const cdnUrl = await uploadToShannzCdn(tempFilePath);

        // Send success message with the CDN URL
        await sock.sendMessage(from, { 
            text: `✅ *Upload Complete to Shannz CDN!*\n\n` +
                  `📄 *File:* ${fileName || mediaType}\n` +
                  `📊 *Type:* ${mediaType.toUpperCase()}\n` +
                  `📦 *Size:* ${fileSizeMB} MB\n\n` +
                  `🔗 *Direct Link:*\n${cdnUrl}\n\n` +
                  `💡 *Note:* This service is external and its availability may vary. No guarantees on content retention.`
        });

    } catch (error) {
        // Log the error for debugging
        console.error('Shannz CDN command error:', error);
        
        // Send a user-friendly error message
        await sock.sendMessage(from, { 
            text: `❌ *Shannz CDN Upload Failed*\n\n` +
                  `*Error:* ${error.message}\n\n` +
                  `*Possible reasons:*\n` +
                  `• File size too large for the CDN (check CDN limits, usually around 50MB for free services)\n` +
                  `• Network connection issues with endpoint.web.id\n` +
                  `• CDN service is temporarily unavailable or returned an unexpected response\n` +
                  `• Unsupported file type or corrupt media\n\n` +
                  `*Suggestions:*\n` +
                  `• Try a smaller file size\n` +
                  `• Check your internet connection\n` +
                  `• Try again later`
        });
    } finally {
        // Clean up the temporary file, if it was created
        // Using require('fs').existsSync for a synchronous check before async unlink
        if (tempFilePath && require('fs').existsSync(tempFilePath)) { 
            try {
                await fs.unlink(tempFilePath);
                console.log(`Deleted temporary file: ${tempFilePath}`);
            } catch (unlinkError) {
                console.error(`Error deleting temporary file ${tempFilePath}:`, unlinkError);
            }
        }
    }
}

// Command metadata for your bot's command loader
shannz.description = "Uploads files to Shannz CDN (a free file hosting service)";
shannz.emoji = "☁️"; // A cloud emoji is fitting
shannz.usage = "/shannz - Reply to or send with media"; // How the user should use it