// commands/read.js
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import dotenv from 'dotenv'; // Import dotenv to access process.env

dotenv.config(); // Load .env vars if not already loaded globally (good practice for commands)

const readCommand = async (sock, msg, from) => {
    // Check if the command is enabled via environment variable
    if (process.env.READ_COMMAND_ENABLED !== 'true') {
        console.log("DEBUG: /read command is disabled via .env.");
        return await sock.sendMessage(from, { text: "❌ The /read command is currently disabled." }, { quoted: msg });
    }

    try {
        const quotedMsgKey = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (!quotedMsgKey || !quotedParticipant) {
            return await sock.sendMessage(from, { text: "Please reply to a message to mark it as read." }, { quoted: msg });
        }

        const messageKey = {
            remoteJid: from,
            id: quotedMsgKey,
            participant: quotedParticipant,
            fromMe: false
        };

        console.log(`DEBUG: Marking message ${quotedMsgKey} as read.`);
        await sock.readMessages([messageKey], 'read'); // 'read' action

        await sock.sendMessage(from, { text: `✅ Marked message as *read* (blue ticks sent).` }, { quoted: msg });

    } catch (err) {
        console.error("❌ Error in read command:", err);
        console.error("❌ Error stack:", err.stack);
        await sock.sendMessage(from, { text: `🚫 An error occurred while marking as read: ${err.message}` }, { quoted: msg });
    }
};

readCommand.description = "Marks the replied message as read (sends blue ticks).";
readCommand.category = "Chat";
readCommand.usage = "/read - Reply to a message.";
readCommand.emoji = "✅";

export default readCommand;