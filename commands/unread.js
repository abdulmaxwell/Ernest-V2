// commands/unread.js
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import dotenv from 'dotenv'; // Import dotenv to access process.env

dotenv.config(); // Load .env vars if not already loaded globally (good practice for commands)

const unreadCommand = async (sock, msg, from) => {
    // Check if the command is enabled via environment variable
    if (process.env.UNREAD_COMMAND_ENABLED !== 'true') {
        console.log("DEBUG: /unread command is disabled via .env.");
        return await sock.sendMessage(from, { text: "❌ The /unread command is currently disabled." }, { quoted: msg });
    }

    try {
        const quotedMsgKey = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (!quotedMsgKey || !quotedParticipant) {
            return await sock.sendMessage(from, { text: "Please reply to a message to mark it as unread." }, { quoted: msg });
        }

        const messageKey = {
            remoteJid: from,
            id: quotedMsgKey,
            participant: quotedParticipant,
            fromMe: false
        };

        console.log(`DEBUG: Marking message ${quotedMsgKey} as unread.`);
        await sock.readMessages([messageKey], 'unread'); // 'unread' action

        await sock.sendMessage(from, { text: `M Marked message as *unread*.` }, { quoted: msg });

    } catch (err) {
        console.error("❌ Error in unread command:", err);
        console.error("❌ Error stack:", err.stack);
        await sock.sendMessage(from, { text: `🚫 An error occurred while marking as unread: ${err.message}` }, { quoted: msg });
    }
};

unreadCommand.description = "Marks the replied message as unread.";
unreadCommand.category = "Chat";
unreadCommand.usage = "/unread - Reply to a message.";
unreadCommand.emoji = "M";

export default unreadCommand;