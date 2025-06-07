// commands/pfp.js
import { jidNormalizedUser } from '@whiskeysockets/baileys';

const getProfilePicture = async (sock, msg, from, args) => {
    try {
        let targetJid;

        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (mentionedJid) {
            targetJid = mentionedJid;
        } else {
            targetJid = msg.key.participant || msg.key.remoteJid;
        }

        if (!targetJid) {
            return await sock.sendMessage(from, { text: "Could not determine target user's JID." }, { quoted: msg });
        }

        const normalizedJid = jidNormalizedUser(targetJid);
        const targetNumber = normalizedJid.split('@')[0]; // Get just the number part for display

        console.log(`🔍 Attempting to fetch profile picture for: ${normalizedJid}`);

        let pfpUrl;
        try {
            pfpUrl = await sock.profilePictureUrl(normalizedJid, 'image');
        } catch (error) {
            if (error.data === 401 || error.message === 'not-authorized') {
                console.log(`❌ Profile picture not accessible for ${normalizedJid} due to privacy settings.`);
                return await sock.sendMessage(from, {
                    text: `❌ I cannot access ${targetNumber}'s profile picture due to their privacy settings.`,
                }, { quoted: msg });
            }
            // Re-throw other errors that aren't specific to privacy
            throw error;
        }


        if (pfpUrl) {
            console.log(`✅ Profile picture URL found for ${normalizedJid}: ${pfpUrl}`);
            await sock.sendMessage(from, { image: { url: pfpUrl }, caption: `📸 Profile picture of ${targetNumber}:` }, { quoted: msg });
        } else {
            // This case should be less likely if 401 is caught, but good to keep as fallback
            console.log(`❌ No profile picture found for: ${normalizedJid}`);
            await sock.sendMessage(from, { text: `❌ No profile picture found for ${targetNumber}.` }, { quoted: msg });
        }

    } catch (err) {
        console.error("❌ Error in getProfilePicture command:", err);
        console.error("❌ Error stack:", err.stack);

        let errorMessage = `🚫 An unexpected error occurred while fetching the profile picture: ${err.message}`;
        // You can add more specific error handling here if other common errors arise

        await sock.sendMessage(from, { text: errorMessage }, { quoted: msg });
    }
};

// Command metadata
getProfilePicture.description = "Gets the profile picture of a tagged user or yourself.";
getProfilePicture.category = "Utility";
getProfilePicture.usage = "/pfp [@user]";
getProfilePicture.emoji = "📸";

export default getProfilePicture;