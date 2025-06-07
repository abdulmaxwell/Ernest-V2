// antidelete.js
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs/promises'; // Using fs/promises for async file operations
import path from 'path';

/**
 * Handles view once messages by downloading and re-uploading them.
 * @param {object} sock - The WhatsApp socket connection object.
 * @param {object} msg - The message object.
 */
export const antidelete = async (sock, msg) => {
    // Add this check at the beginning
    if (!msg.message) {
        return; // Exit if there's no message content
    }

    const from = msg.key.remoteJid;
    const messageType = Object.keys(msg.message)[0]; // Get the type of message

    // Check if it's a view once message
    if (messageType === 'viewOnceMessageV2') {
        const viewOnceMessage = msg.message.viewOnceMessageV2.message;

        // Add an additional check for viewOnceMessage to ensure it's not null/undefined
        if (!viewOnceMessage) {
            console.warn('Skipping view once message: viewOnceMessage.message is null or undefined.');
            return;
        }

        const mediaType = Object.keys(viewOnceMessage)[0]; // e.g., 'imageMessage', 'videoMessage'

        if (mediaType === 'imageMessage' || mediaType === 'videoMessage') {
            try {
                // Download the media
                const stream = await downloadContentFromMessage(viewOnceMessage[mediaType], mediaType.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                // Determine file extension
                const ext = mediaType === 'imageMessage' ? 'jpg' : 'mp4';
                const filename = `viewonce_${msg.key.id}.${ext}`;
                // Use a more robust way to get the base directory, or define it explicitly
                // For simplicity, let's assume 'temp' is in the current working directory of the script.
                const tempDir = path.join(process.cwd(), 'temp');
                const filePath = path.join(tempDir, filename);

                // Ensure the 'temp' directory exists
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, buffer);

                console.log(`Downloaded view once ${mediaType}: ${filePath}`);

                // Send the media back to the chat
                if (mediaType === 'imageMessage') {
                    await sock.sendMessage(from, { image: { url: filePath }, caption: "📸 View Once Image (Anti-Delete)" });
                } else if (mediaType === 'videoMessage') {
                    await sock.sendMessage(from, { video: { url: filePath }, caption: "🎥 View Once Video (Anti-Delete)" });
                }

                // Optionally, delete the temporary file after sending
                await fs.unlink(filePath);
                console.log(`Deleted temporary file: ${filePath}`);

            } catch (error) {
                console.error('❌ Error handling view once message:', error);
            }
        }
    }
};