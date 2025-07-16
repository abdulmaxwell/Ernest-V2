// commands/leavegroup.js
import logger from '../utilis/logger.js'; // Adjust path
import pkg from '@whiskeysockets/baileys';
const { areJidsGroup, jidNormalizedUser} = pkg;

async function leavegroup(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !leavegroup by ${from}`);
        return;
    }
    // --- End Authorization Check ---

    // Ensure the command is used in a group chat
    if (!areJidsGroup(from)) {
        await sock.sendMessage(from, { text: 'This command can only be used in a group chat to make the bot leave *that* group.' });
        return;
    }

    const groupJid = from; // The 'from' JID is the group JID if sent in a group

    try {
        await sock.groupLeave(groupJid);
        logger.info(`Bot left group: ${groupJid} initiated by ${from}`);
        // Cannot send message back to the group after leaving, so send to owner
        if (ownerJid) {
            await sock.sendMessage(ownerJid, { text: `✅ Bot successfully left group: ${groupJid}` });
        }
    } catch (error) {
        logger.error(`Error leaving group ${groupJid} initiated by ${from}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to leave group. Error: ${error.message || 'Unknown error.'}` });
    }
}

leavegroup.description = 'Makes the bot leave the current group chat.';
leavegroup.emoji = '🚪';
leavegroup.category = 'Group Management';

export default leavegroup;