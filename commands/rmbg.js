import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import os from 'os'; // Import the 'os' module for tmpdir

// Helper function to convert buffer to file
const buffToFile = async (buffer) => {
    const tempDir = os.tmpdir(); // Use os.tmpdir() directly
    const fileName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const filePath = path.join(tempDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return filePath;
};

// Remove background API function
const removeBgApi = async (imageBuffer, apiKey) => {
    const formData = new FormData();
    const inputPath = await buffToFile(imageBuffer);

    formData.append('size', 'auto');
    formData.append('image_file', fs.createReadStream(inputPath), path.basename(inputPath));

    try {
        const response = await axios({
            method: 'post',
            url: 'https://api.remove.bg/v1.0/removebg',
            data: formData,
            responseType: 'arraybuffer',
            headers: {
                ...formData.getHeaders(),
                'X-Api-Key': apiKey,
            },
            encoding: null,
        });

        // Clean up temp file
        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
        }

        if (response.status !== 200) {
            console.error('Remove.bg API Error:', response.status, response.statusText);
            // Attempt to parse error data if it's text
            if (response.data) {
                try {
                    const errorData = JSON.parse(response.data.toString('utf8'));
                    console.error('Remove.bg API Error Details:', errorData);
                    // You might want to return specific error messages based on errorData
                } catch (parseError) {
                    console.error('Could not parse Remove.bg error response as JSON.');
                }
            }
            return null;
        }

        return response.data;
    } catch (error) {
        // Clean up temp file on error
        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
        }
        console.error('Remove.bg request failed:', error.message);
        // Log more details if it's an Axios error
        if (error.response) {
            console.error('Axios error response data:', error.response.data.toString('utf8'));
            console.error('Axios error response status:', error.response.status);
        }
        return null;
    }
};

// =================================================================
// REMOVE BACKGROUND COMMAND
// =================================================================

export default async function removebg(sock, msg, from) {
    let imageBuffer = null;
    let targetMessage = msg; // Start by assuming the current message holds the image

    // If it's a quoted message, check the quoted message for an image
    if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        targetMessage = { message: msg.message.extendedTextMessage.contextInfo.quotedMessage };
    }

    // Check if the target message (either current or quoted) has an image
    if (targetMessage.message?.imageMessage) {
        try {
            imageBuffer = await sock.downloadMediaMessage(targetMessage);
        } catch (downloadError) {
            console.error('Error downloading media:', downloadError);
            await sock.sendMessage(from, { text: '❌ Could not download the image. Please ensure it\'s a valid image message.' });
            return;
        }
    }

    // If no image buffer is obtained after checking both current and quoted
    if (!imageBuffer) {
        await sock.sendMessage(from, {
            text: '🖼️ *Remove Background*\n\n' +
                '📝 Please reply to an image to remove its background!\n\n' +
                '✨ **How to use:**\n' +
                '1. Send or forward an image\n' +
                '2. Reply to that image with `removebg`\n' +
                '3. Wait for the magic! ✨\n\n' +
                '🎨 The result will have a transparent background, perfect for stickers!'
        });
        return;
    }

    try {
        // Check if API key is configured
        const apiKey = process.env.REMOVEBG_API_KEY || process.env.REMOVEBG;
        if (!apiKey) {
            await sock.sendMessage(from, {
                text: '❌ *Service Unavailable*\n\n' +
                    '🔧 Remove.bg API key is not configured!\n' +
                    '📞 Please contact the bot administrator to set up the service.\n\n' +
                    '💡 *For bot owner:* Add `REMOVEBG_API_KEY` to your .env file'
            });
            return;
        }

        // Send processing message
        const processingMsg = await sock.sendMessage(from, {
            text: '🔄 *Processing your image...*\n\n' +
                '✨ Removing background with AI magic!\n' +
                '⏳ This may take a few seconds...'
        });

        // Remove background
        const resultBuffer = await removeBgApi(imageBuffer, apiKey);

        if (!resultBuffer) {
            await sock.sendMessage(from, {
                text: '❌ *Failed to remove background!*\n\n' +
                    '🔍 **Possible reasons:**\n' +
                    '• Invalid or expired API key\n' +
                    '• Monthly API limit exceeded\n' +
                    '• Image format not supported by Remove.bg\n' +
                    '• Network connection issues\n' +
                    '• Server temporarily unavailable\n' +
                    '• No discernible background in the image\n\n' + // Added this
                    '🔄 Please try again later or contact support.'
            });
            return;
        }

        // Send result
        await sock.sendMessage(from, {
            image: resultBuffer,
            caption: '✅ *Background removed successfully!*\n\n' +
                '🎨 Your image now has a transparent background!\n' +
                '💡 **Perfect for:**\n' +
                '• Creating stickers\n' +
                '• Design projects\n' +
                '• Profile pictures\n' +
                '• Presentations\n\n' +
                '🌟 Powered by Remove.bg AI'
        });

    } catch (error) {
        console.error('Remove background command error:', error);
        await sock.sendMessage(from, {
            text: '❌ *Unexpected Error*\n\n' +
                '🔧 An error occurred while processing your request.\n' +
                '🔄 Please try again or contact support if the issue persists.\n\n' +
                '📝 Error logged for debugging.'
        });
    }
}

removebg.description = "Remove background from images using AI";
removebg.emoji = "🖼️";