// commands/status.js
import { jidNormalizedUser } from '@whiskeysockets/baileys';

const getUserStatus = async (sock, msg, from, args) => {
    try {
        let targetJid;

        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (mentionedJid) {
            targetJid = mentionedJid;
        } else if (args[0] && args[0].startsWith('2')) {
            targetJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
            targetJid = msg.message.extendedTextMessage.contextInfo.participant;
        } else {
            targetJid = msg.key.participant || msg.key.remoteJid;
        }

        if (!targetJid) {
            return await sock.sendMessage(from, { text: "Please tag a user, provide a number, or reply to a message." }, { quoted: msg });
        }

        const normalizedJid = jidNormalizedUser(targetJid);
        const targetNumber = normalizedJid.split('@')[0];

        console.log(`🔍 Attempting to fetch status for: ${normalizedJid}`);

        const status = await sock.fetchStatus(normalizedJid);

        if (status && status.status) {
            await sock.sendMessage(from, { text: `💬 *${targetNumber}'s About:* ${status.status}` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: `❌ ${targetNumber} does not have a public 'About' status set.` }, { quoted: msg });
        }

    } catch (err) {
        console.error("❌ Error in getUserStatus command:", err);
        console.error("❌ Error stack:", err.stack);
        await sock.sendMessage(from, { text: `🚫 An error occurred while fetching the status: ${err.message}` }, { quoted: msg });
    }
};

getUserStatus.description = "Gets the 'About' status of a tagged user, a provided number, or a replied message's sender.";
getUserStatus.category = "Utility";
getUserStatus.usage = "/status [@user | <number> | reply to msg]";
getUserStatus.emoji = "💬";

export default getUserStatus;