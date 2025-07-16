// commands/setdesc.js
import pkg from '@whiskeysockets/baileys';
const { areJidsGroup} = pkg;
import logger from '../utilis/logger.js'; // Adjust path

async function setdesc(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !setdesc by ${from}`);
        return;
    }
    // --- End Authorization Check ---

    if (!areJidsGroup(from)) {
        await sock.sendMessage(from, { text: 'This command can only be used in a group chat.' });
        return;
    }

    const groupJid = from;
    const newDescription = args.join(' '); // Can be empty if user sends `!setdesc` without args

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
        await sock.sendMessage(from, { text: '🚫 I need to be an admin in this group to change its description.' });
        return;
    }

    try {
        await sock.groupUpdateDescription(groupJid, newDescription || undefined); // Pass undefined to clear
        if (newDescription) {
            await sock.sendMessage(from, { text: `✅ Group description updated to:\n\`\`\`\n${newDescription}\n\`\`\`` });
            logger.info(`Group description of ${groupJid} updated by ${from}`);
        } else {
            await sock.sendMessage(from, { text: '✅ Group description cleared.' });
            logger.info(`Group description of ${groupJid} cleared by ${from}`);
        }
    } catch (error) {
        logger.error(`Error updating group description for ${groupJid}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to update group description. Error: ${error.message || 'Unknown error.'}` });
    }
}

setdesc.description = 'Changes the description of the group. Use without text to clear it.';
setdesc.emoji = '💬';
setdesc.category = 'Group Management';

export default setdesc;