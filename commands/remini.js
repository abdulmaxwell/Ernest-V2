import FormData from 'form-data';
// You might need to import axios if formData.submit is not using it internally or if you want to switch to axios for clarity.
// import axios from 'axios';


async function enhanceImage(imageBuffer, enhanceType) {
    return new Promise(async (resolve, reject) => {
        // Available enhancement types
        const validTypes = ["enhance", "recolor", "dehaze"];

        // Validate enhancement type, default to 'enhance' if invalid
        const selectedType = validTypes.includes(enhanceType) ? enhanceType : validTypes[0];

        // Create form data for the API request
        const formData = new FormData();
        const apiUrl = `https://inferenceengine.vyro.ai/${selectedType}`;

        // Append model version
        formData.append("model_version", 1, {
            'Content-Transfer-Encoding': 'binary',
            'contentType': "multipart/form-data; charset=utf-8"
        });

        // Append image buffer
        formData.append("image", Buffer.from(imageBuffer), {
            'filename': "enhance_image_body.jpg",
            'contentType': "image/jpeg"
        });

        // Submit the form data to the API
        formData.submit({
            'url': apiUrl,
            'host': "inferenceengine.vyro.ai",
            'path': `/${selectedType}`,
            'protocol': "https:",
            'headers': {
                'User-Agent': "okhttp/4.9.3",
                'Connection': "Keep-Alive",
                'Accept-Encoding': "gzip"
            }
        }, function (error, response) {
            if (error) {
                return reject(error);
            }

            const chunks = [];

            response.on("data", function (chunk) {
                chunks.push(chunk);
            }).on("end", () => {
                resolve(Buffer.concat(chunks));
            });

            response.on("error", (error) => {
                reject(error);
            });
        });
    });
}

export default async function enhance(sock, msg, from) {
    try {
        // Determine the message containing the image
        let targetMessageForDownload = msg; // Default to the current message
        let imageMessageContent = msg.message?.imageMessage; // Check if current message has an image

        // If it's a quoted message, prioritize it for download
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage?.imageMessage) {
            targetMessageForDownload = { message: quotedMessage }; // Create a structure that downloadMediaMessage can handle
            imageMessageContent = quotedMessage.imageMessage; // Update imageMessageContent for the check below
        }

        if (!imageMessageContent) { // Check if an image message was actually found
            await sock.sendMessage(from, {
                text: '❌ Please send an image or reply to an image to enhance it.\n\nAvailable types:\n• enhance - General image enhancement\n• recolor - Color enhancement\n• • dehaze - Remove haze/fog'
            });
            return;
        }

        // Get enhancement type from command arguments
        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const args = messageText.split(' ');
        const enhanceType = args[1] || 'enhance'; // Default to 'enhance'

        await sock.sendMessage(from, { text: '🔄 Processing image... Please wait.' });

        // Download the image from the correct message object
        // Use targetMessageForDownload which now correctly points to either the current or quoted image message
        const imageBuffer = await sock.downloadMediaMessage(targetMessageForDownload);

        // Enhance the image
        const enhancedImageBuffer = await enhanceImage(imageBuffer, enhanceType);

        // Send the enhanced image back
        await sock.sendMessage(from, {
            image: enhancedImageBuffer,
            caption: `✨ Image enhanced using ${enhanceType} mode!`
        });

    } catch (error) {
        console.error('Error enhancing image:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to enhance image. Please try again later.'
        });
    }
}

enhance.description = "Enhance, recolor, or dehaze images using AI";
enhance.emoji = "✨";