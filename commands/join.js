// commands/joingroup.js
import logger from '../utilis/logger.js'; // Adjust path

async function joingroup(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !joingroup by ${from}`);
        return;
    }
    // --- End Authorization Check ---

    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: `!joingroup <invite_code>`' });
        return;
    }

    const inviteCode = args[0];

    try {
        const groupJid = await sock.groupAcceptInvite(inviteCode);
        await sock.sendMessage(from, { text: `✅ Successfully joined group: ${groupJid}` });
        logger.info(`Bot joined group via invite code: ${groupJid} from ${from}`);
    } catch (error) {
        logger.error(`Error joining group with invite code ${inviteCode} from ${from}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to join group. Error: ${error.message || 'Unknown error.'}` });
    }
}

joingroup.description = 'Joins a WhatsApp group using an invite code.';
joingroup.emoji = '🤝';
joingroup.category = 'Group Management';

export default joingroup;