// commands/whois.js
import { jidNormalizedUser } from '@whiskeysockets/baileys';

const whois = async (sock, msg, from, args) => {
    try {
        let targetJid;

        // Check for tagged user
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (mentionedJid) {
            targetJid = mentionedJid;
        } else if (args[0] && args[0].startsWith('2')) { // Basic check if arg looks like a number
            targetJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'; // Clean and append WhatsApp suffix
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) { // If replying to someone
            targetJid = msg.message.extendedTextMessage.contextInfo.participant;
        } else {
            targetJid = msg.key.participant || msg.key.remoteJid; // Fallback to sender
        }

        if (!targetJid) {
            return await sock.sendMessage(from, { text: "Please tag a user, provide a number, or reply to a message to use this command." }, { quoted: msg });
        }

        const normalizedJid = jidNormalizedUser(targetJid);
        const targetNumber = normalizedJid.split('@')[0];

        let userInfo = `*🕵️‍♂️ Whois for ${targetNumber}:*\n\n`;

        // 1. Fetch Profile Picture URL
        try {
            const pfpUrl = await sock.profilePictureUrl(normalizedJid, 'image');
            if (pfpUrl) {
                userInfo += `📸 *Profile Picture:* [Link](${pfpUrl})\n`;
                // Optionally send the image directly for convenience
                await sock.sendMessage(from, { image: { url: pfpUrl }, caption: `Profile picture for ${targetNumber}:` });
            } else {
                userInfo += `📸 *Profile Picture:* Not available or private.\n`;
            }
        } catch (error) {
            if (error.data === 401 || error.message === 'not-authorized') {
                userInfo += `📸 *Profile Picture:* Private/Not accessible.\n`;
            } else {
                console.error(`Error fetching PFP for ${normalizedJid}:`, error);
                userInfo += `📸 *Profile Picture:* Error fetching.\n`;
            }
        }

        // 2. Fetch Status Message
        try {
            const status = await sock.fetchStatus(normalizedJid);
            if (status && status.status) {
                userInfo += `\n💬 *About:* ${status.status}\n`;
            } else {
                userInfo += `\n💬 *About:* Not set or private.\n`;
            }
        } catch (error) {
            console.error(`Error fetching status for ${normalizedJid}:`, error);
            userInfo += `\n💬 *About:* Error fetching.\n`;
        }

        // 3. Check if they are in your contacts (assuming bot's contacts)
        // This isn't a direct Baileys function on 'sock', but rather from your local contacts or if you implement a contact list sync.
        // For now, we'll skip this unless you have contact management implemented.
        // userInfo += `\n👥 *In Contacts:* (Requires contact management)\n`;

        // 4. Check Business Profile (if applicable)
        try {
            const businessProfile = await sock.getBusinessProfile(normalizedJid);
            if (businessProfile && Object.keys(businessProfile).length > 0) {
                userInfo += `\n🏢 *Business Profile:*\n`;
                if (businessProfile.name) userInfo += `  - Name: ${businessProfile.name}\n`;
                if (businessProfile.address) userInfo += `  - Address: ${businessProfile.address}\n`;
                if (businessProfile.description) userInfo += `  - Description: ${businessProfile.description}\n`;
                if (businessProfile.email) userInfo += `  - Email: ${businessProfile.email}\n`;
                if (businessProfile.websites && businessProfile.websites.length > 0) {
                    userInfo += `  - Websites: ${businessProfile.websites.join(', ')}\n`;
                }
            } else {
                userInfo += `\n🏢 *Business Profile:* Not a business account or no public info.\n`;
            }
        } catch (error) {
            console.error(`Error fetching business profile for ${normalizedJid}:`, error);
            userInfo += `\n🏢 *Business Profile:* Error fetching.\n`;
        }


        await sock.sendMessage(from, { text: userInfo }, { quoted: msg });

    } catch (err) {
        console.error("❌ Error in whois command:", err);
        console.error("❌ Error stack:", err.stack);
        await sock.sendMessage(from, { text: `🚫 An error occurred while fetching user info: ${err.message}` }, { quoted: msg });
    }
};

whois.description = "Gets detailed information about a tagged user, a provided number, or a replied message's sender.";
whois.category = "Utility";
whois.usage = "/whois [@user | <number> | reply to msg]";
whois.emoji = "🕵️‍♂️";

export default whois;