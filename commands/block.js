// commands/block.js
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import dotenv from 'dotenv';
dotenv.config();

export default async function block(sock, msg, from, args) {
    // --- Owner Check ---
    const ownerJid = process.env.OWNER_NUMBER ? jidNormalizedUser(process.env.OWNER_NUMBER.trim()) : null;

    if (!ownerJid || from !== ownerJid) {
        await sock.sendMessage(from, { text: "🚫 You are not authorized to use this command. Only the bot owner can block users." }, { quoted: msg });
        return;
    }
    // --- End Owner Check ---

    let targetJid = null;

    // 1. Check if a user was mentioned
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // 2. Check if it's a reply to a message
    else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
    }
    // 3. Check if a number was provided in arguments
    else if (args.length > 0) {
        const number = args[0].replace(/\D/g, ''); // Remove non-digits
        if (number) {
            targetJid = jidNormalizedUser(`${number}@s.whatsapp.net`);
        }
    }

    if (!targetJid) {
        await sock.sendMessage(from, { text: "❌ Please mention a user, reply to a message, or provide a number to block (e.g., `!block 2547xxxxxxxx`)." }, { quoted: msg });
        return;
    }

    // Don't allow blocking yourself or the bot's own number
    if (targetJid === ownerJid || targetJid === sock.user.id) {
        await sock.sendMessage(from, { text: "😅 I cannot block the owner or myself!" }, { quoted: msg });
        return;
    }

    try {
        await sock.updateBlockStatus(targetJid, 'block');
        await sock.sendMessage(from, { text: `✅ Successfully blocked ${targetJid.split('@')[0]}!` }, { quoted: msg });
        console.log(`Blocked user: ${targetJid}`);
    } catch (error) {
        console.error('Error blocking user:', error);
        await sock.sendMessage(from, { text: `❌ Failed to block ${targetJid.split('@')[0]}. Error: ${error.message}` }, { quoted: msg });
    }
}

export const description = "🚫 [OWNER] Blocks a user. Mention, reply, or provide number.";
export const category = "owner";