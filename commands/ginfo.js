// commands/groupinfo.js
// commands/ginfo.js
import pkg from '@whiskeysockets/baileys';
const { areJidsGroup, jidDecode } = pkg;
// ...
import logger from '../utilis/logger.js'; // Adjust path

async function groupinfo(sock, msg, from, args) {
    // --- Authorization Check (RECOMMENDED) ---
    const ownerJid = process.env.BOT_OWNER_JID_FULL;
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for !groupinfo by ${from}`);
        return;
    }
    // --- End Authorization Check ---

    if (!areJidsGroup(from)) {
        await sock.sendMessage(from, { text: 'This command can only be used in a group chat.' });
        return;
    }

    const groupJid = from;
    try {
        const groupMetadata = await sock.groupMetadata(groupJid);

        if (!groupMetadata) {
            await sock.sendMessage(from, { text: '❌ Could not retrieve group information.' });
            return;
        }

        const ownerNumber = jidDecode(groupMetadata.owner)?.user || 'Unknown';
        const creationDate = new Date(groupMetadata.creation * 1000).toLocaleString();
        const botJid = sock.user.id;
        const botParticipant = groupMetadata.participants.find(p => p.id === botJid);
        const botAdminStatus = botParticipant?.admin ? `(${botParticipant.admin})` : 'No';

        let info = `📊 *Group Info:*\n\n`;
        info += `*Name:* ${groupMetadata.subject}\n`;
        info += `*ID:* \`\`\`${groupMetadata.id}\`\`\`\n`;
        info += `*Created By:* ${ownerNumber}\n`;
        info += `*Creation Date:* ${creationDate}\n`;
        info += `*Total Participants:* ${groupMetadata.size}\n`;
        info += `*Bot is Admin:* ${botAdminStatus}\n`;
        info += `*Restrict Settings:* ${groupMetadata.restrict ? 'Admins Only' : 'All Participants'}\n`;
        info += `*Announce Settings:* ${groupMetadata.announce ? 'Admins Only' : 'All Participants'}\n`;
        info += `*Join Approval:* ${groupMetadata.joinApprovalMode ? 'On' : 'Off'}\n`;
        info += `*Ephemeral Messages:* ${groupMetadata.ephemeralDuration ? `${groupMetadata.ephemeralDuration / (60 * 60 * 24)} days` : 'Off'}\n`;

        if (groupMetadata.desc) {
            info += `\n*Description:*\n\`\`\`\n${groupMetadata.desc}\n\`\`\``;
        } else {
            info += `\n*Description:* None\n`;
        }

        await sock.sendMessage(from, { text: info });
        logger.info(`Provided group info for ${groupJid} to ${from}`);

    } catch (error) {
        logger.error(`Error fetching group info for ${groupJid}:`, error);
        await sock.sendMessage(from, { text: `❌ Failed to get group information. Error: ${error.message || 'Unknown error.'}` });
    }
}

groupinfo.description = 'Displays detailed information about the current group.';
groupinfo.emoji = 'ℹ️';
groupinfo.category = 'Group Management';

export default groupinfo;