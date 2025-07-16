// commands/add.js
import pkg from '@whiskeysockets/baileys';
const { areJidsGroup, jidNormalizedUser, jidDecode } = pkg;
import logger from '../utilis/logger.js'; // Adjust path

async function add(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !add by ${from}`);
        return;
    }
    // --- End Authorization Check ---
//../utilis/logger.js
    if (!areJidsGroup(from)) {
        await sock.sendMessage(from, { text: 'This command can only be used in a group chat.' });
        return;
    }

    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: `!add <phoneNumber(s)>` (e.g., `!add 254712345678 254798765432`)' });
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
        await sock.sendMessage(from, { text: '🚫 I need to be an admin in this group to add participants.' });
        return;
    }

    const participantsToAdd = [];
    for (const arg of args) {
        const phoneNumber = arg.replace(/[^0-9]/g, '');
        if (phoneNumber) {
            participantsToAdd.push(jidNormalizedUser(`${phoneNumber}@s.whatsapp.net`));
        }
    }

    if (participantsToAdd.length === 0) {
        await sock.sendMessage(from, { text: '🚫 No valid phone numbers provided to add.' });
        return;
    }

    try {
        const response = await sock.groupParticipantsUpdate(groupJid, participantsToAdd, 'add');
        let successCount = 0;
        let failMessages = [];

        response.forEach(res => {
            const num = jidDecode(res.jid)?.user;
            if (res.status === '200') {
                successCount++;
            } else {
                failMessages.push(`${num} (Error: ${res.status})`);
            }
        });

        let reply = `✅ Added ${successCount} participant(s).`;
        if (failMessages.length > 0) {
            reply += `\n❌ Failed to add: ${failMessages.join(', ')}.`;
        }
        await sock.sendMessage(from, { text: reply });
        logger.info(`Attempted to add participants to ${groupJid}: ${participantsToAdd.join(', ')}. Results: ${JSON.stringify(response)}`);
    } catch (error) {
        logger.error(`Error adding participants to ${groupJid}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to add participants. Error: ${error.message || 'Unknown error.'}` });
    }
}

add.description = 'Adds one or more participants to the group.';
add.emoji = '➕';
add.category = 'Group Management';

export default add;