import { WAMessageStubType, downloadContentFromMessage } from '@whiskeysockets/baileys'; // Import downloadContentFromMessage
import fs from 'fs/promises'; // Import fs/promises for file operations
import path from 'path'; // Import path for path manipulation

const setProfilePicture = async (sock, msg, from) => {
    try {
        console.log("🔍 Attempting to set profile picture...");

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            console.log("❌ No message quoted.");
            return await sock.sendMessage(from, {
                text: "❌ *Please reply to an image message* to set it as the profile picture.",
            }, { quoted: msg });
        }

        if (!quoted.imageMessage) {
            console.log("❌ Quoted message is not an image.");
            return await sock.sendMessage(from, {
                text: "❌ *The replied message is not an image.* Please reply to an image.",
            }, { quoted: msg });
        }

        const imageMessage = quoted.imageMessage;

        // Download the image buffer using downloadContentFromMessage
        console.log("⬇️ Downloading image for profile picture...");
        const stream = await downloadContentFromMessage(imageMessage, 'image'); // 'image' for image type
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (!buffer || buffer.length === 0) {
            console.log("❌ Failed to download image buffer.");
            return await sock.sendMessage(from, {
                text: "❌ Failed to download the image. It might be corrupted or expired.",
            }, { quoted: msg });
        }

        const botJid = sock.user.id;

        console.log(`📸 Setting profile picture for ${botJid}...`);
        await sock.updateProfilePicture(botJid, buffer);

        console.log("✅ Profile picture updated successfully!");
        await sock.sendMessage(from, {
            text: "✅ Profile picture updated successfully!",
        }, { quoted: msg });

    } catch (err) {
        console.error("❌ Error in setProfilePicture command:", err);
        console.error("❌ Error stack:", err.stack);

        let errorMessage = "🚫 *Failed to set profile picture due to an unexpected error.*";
        if (err.message.includes("Failed to download")) {
            errorMessage = "❌ *Failed to download the image.* It might be too large or invalid.";
        } else if (err.message.includes("Invalid image")) {
            errorMessage = "❌ *The image provided is invalid or too large.*";
        }

        await sock.sendMessage(from, {
            text: errorMessage,
        }, { quoted: msg });
    }
};

setProfilePicture.description = "Sets the bot's profile picture. Reply to an image.";
setProfilePicture.category = "Bot";
setProfilePicture.usage = "/pp - Reply to an image.";
setProfilePicture.emoji = "📸";

export default setProfilePicture;