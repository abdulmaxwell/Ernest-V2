// commands/kick.js
import pkg from '@whiskeysockets/baileys';
const { areJidsGroup, jidNormalizedUser, jidDecode } = pkg;
import logger from '../utilis/logger.js'; // Adjust path

async function kick(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !kick by ${from}`);
        return;
    }
    // --- End Authorization Check ---

    if (!areJidsGroup(from)) {
        await sock.sendMessage(from, { text: 'This command can only be used in a group chat.' });
        return;
    }

    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: `!kick <phoneNumber(s)>` (e.g., `!kick 254712345678 @mention`)' });
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
        await sock.sendMessage(from, { text: '🚫 I need to be an admin in this group to kick participants.' });
        return;
    }

    const participantsToKick = [];
    // Handle mentions (Baileys puts mentioned JIDs in contextInfo.mentionedJid)
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        participantsToKick.push(...msg.message.extendedTextMessage.contextInfo.mentionedJid.map(jidNormalizedUser));
    }

    // Handle numbers provided as arguments
    for (const arg of args) {
        const phoneNumber = arg.replace(/[^0-9]/g, '');
        if (phoneNumber) {
            participantsToKick.push(jidNormalizedUser(`${phoneNumber}@s.whatsapp.net`));
        }
    }

    // Remove duplicates
    const uniqueParticipantsToKick = [...new Set(participantsToKick)];

    if (uniqueParticipantsToKick.length === 0) {
        await sock.sendMessage(from, { text: '🚫 No valid phone numbers or mentions provided to kick.' });
        return;
    }

    try {
        const response = await sock.groupParticipantsUpdate(groupJid, uniqueParticipantsToKick, 'remove');
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

        let reply = `✅ Kicked ${successCount} participant(s).`;
        if (failMessages.length > 0) {
            reply += `\n❌ Failed to kick: ${failMessages.join(', ')}.`;
        }
        await sock.sendMessage(from, { text: reply });
        logger.info(`Attempted to kick participants from ${groupJid}: ${uniqueParticipantsToKick.join(', ')}. Results: ${JSON.stringify(response)}`);
    } catch (error) {
        logger.error(`Error kicking participants from ${groupJid}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to kick participants. Error: ${error.message || 'Unknown error.'}` });
    }
}

kick.description = 'Removes one or more participants from the group. Can use mentions or phone numbers.';
kick.emoji = '👟';
kick.category = 'Group Management';

export default kick;