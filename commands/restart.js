// commands/restart.js
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import dotenv from 'dotenv';
dotenv.config();

export default async function restart(sock, msg, from) {
    // --- Owner Check ---
    const ownerJid = process.env.OWNER_NUMBER ? jidNormalizedUser(process.env.OWNER_NUMBER.trim()) : null;

    if (!ownerJid || from !== ownerJid) {
        await sock.sendMessage(from, { text: "🚫 You are not authorized to use this command. Only the bot owner can restart me." }, { quoted: msg });
        return;
    }
    // --- End Owner Check ---

    try {
        await sock.sendMessage(from, { text: "🔄 Restarting bot... Please wait a moment." }, { quoted: msg });
        console.log("Bot initiated restart process.");

        // Give WhatsApp some time to send the message before exiting
        setTimeout(() => {
            process.exit(0); // Exit with a success code to trigger restart by process manager
        }, 1000); // 1 second delay
    } catch (error) {
        console.error('Error during restart command:', error);
        await sock.sendMessage(from, { text: `❌ Failed to initiate restart. Error: ${error.message}` }, { quoted: msg });
    }
}

export const description = "🔄 [OWNER] Restarts the bot process.";
export const category = "owner";