// commands/setsubject.js
import pkg from '@whiskeysockets/baileys';
const { areJidsGroup } = pkg;
import logger from '../utilis/logger.js'; // Adjust path

async function setsubject(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !setsubject by ${from}`);
        return;
    }
    // --- End Authorization Check ---

    if (!areJidsGroup(from)) {
        await sock.sendMessage(from, { text: 'This command can only be used in a group chat.' });
        return;
    }

    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: `!setsubject <new_subject>`' });
        return;
    }

    const groupJid = from;
    const newSubject = args.join(' ');

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
        await sock.sendMessage(from, { text: '🚫 I need to be an admin in this group to change its subject.' });
        return;
    }

    try {
        await sock.groupUpdateSubject(groupJid, newSubject);
        await sock.sendMessage(from, { text: `✅ Group subject updated to: *${newSubject}*` });
        logger.info(`Group subject of ${groupJid} updated to "${newSubject}" by ${from}`);
    } catch (error) {
        logger.error(`Error updating group subject for ${groupJid}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to update group subject. Error: ${error.message || 'Unknown error.'}` });
    }
}

setsubject.description = 'Changes the subject (name) of the group.';
setsubject.emoji = '📝';
setsubject.category = 'Group Management';

export default setsubject;