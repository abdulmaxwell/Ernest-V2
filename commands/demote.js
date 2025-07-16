// commands/demote.js
import pkg from '@whiskeysockets/baileys';
const { areJidsGroup, jidNormalizedUser, jidDecode } = pkg;
import logger from '../utilis/logger.js'; // Adjust path

async function demote(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !demote by ${from}`);
        return;
    }
    // --- End Authorization Check ---

    if (!areJidsGroup(from)) {
        await sock.sendMessage(from, { text: 'This command can only be used in a group chat.' });
        return;
    }

    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: `!demote <phoneNumber(s)>` (e.g., `!demote 254712345678 @mention`)' });
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
        await sock.sendMessage(from, { text: '🚫 I need to be an admin in this group to demote participants.' });
        return;
    }

    const participantsToDemote = [];
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        participantsToDemote.push(...msg.message.extendedTextMessage.contextInfo.mentionedJid.map(jidNormalizedUser));
    }
    for (const arg of args) {
        const phoneNumber = arg.replace(/[^0-9]/g, '');
        if (phoneNumber) {
            participantsToDemote.push(jidNormalizedUser(`${phoneNumber}@s.whatsapp.net`));
        }
    }
    const uniqueParticipantsToDemote = [...new Set(participantsToDemote)];

    if (uniqueParticipantsToDemote.length === 0) {
        await sock.sendMessage(from, { text: '🚫 No valid phone numbers or mentions provided to demote.' });
        return;
    }

    try {
        const response = await sock.groupParticipantsUpdate(groupJid, uniqueParticipantsToDemote, 'demote');
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

        let reply = `✅ Demoted ${successCount} admin(s) to participant.`;
        if (failMessages.length > 0) {
            reply += `\n❌ Failed to demote: ${failMessages.join(', ')}.`;
        }
        await sock.sendMessage(from, { text: reply });
        logger.info(`Attempted to demote participants in ${groupJid}: ${uniqueParticipantsToDemote.join(', ')}. Results: ${JSON.stringify(response)}`);
    } catch (error) {
        logger.error(`Error demoting participants in ${groupJid}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to demote participants. Error: ${error.message || 'Unknown error.'}` });
    }
}

demote.description = 'Demotes one or more group admins to regular participants. Can use mentions or phone numbers.';
demote.emoji = '👇';
demote.category = 'Group Management';

export default demote;