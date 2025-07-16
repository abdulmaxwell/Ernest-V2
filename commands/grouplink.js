// commands/grouplink.js
import pkg from '@whiskeysockets/baileys';
const { areJidsGroup } = pkg;
import logger from '../utilis/logger.js'; // Adjust path

async function grouplink(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !grouplink by ${from}`);
        return;
    }
    // --- End Authorization Check ---

    if (!areJidsGroup(from)) {
        await sock.sendMessage(from, { text: 'This command can only be used in a group chat.' });
        return;
    }

    const groupJid = from;
    let groupMetadata;
    try {
        groupMetadata = await sock.groupMetadata(groupJid);
    } catch (error) {
        logger.error(`Error fetching group metadata for ${groupJid}:`, error);
        await sock.sendMessage(from, { text: '❌ Could not retrieve group information. Please try again.' });
        return;
    }

    const botJid = sock.user.id;
    const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);

    if (!botIsAdmin) {
        await sock.sendMessage(from, { text: '🚫 I need to be an admin in this group to get the invite link.' });
        return;
    }

    try {
        const inviteCode = await sock.groupInviteCode(groupJid);
        if (inviteCode) {
            await sock.sendMessage(from, { text: `🔗 Group Invite Link: https://chat.whatsapp.com/${inviteCode}` });
            logger.info(`Provided group invite link for ${groupJid} to ${from}`);
        } else {
            await sock.sendMessage(from, { text: '❌ Could not retrieve group invite link.' });
            logger.warn(`Failed to retrieve group invite link for ${groupJid}`);
        }
    } catch (error) {
        logger.error(`Error getting group invite link for ${groupJid}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to get group invite link. Error: ${error.message || 'Unknown error.'}` });
    }
}

grouplink.description = 'Gets the current invite link for the group.';
grouplink.emoji = '🔗';
grouplink.category = 'Group Management';

export default grouplink;