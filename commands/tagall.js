export default async function tagAll(sock, msg, from) {
    try {
        // Check if the command is used in a group chat
        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { 
                text: '❌ This command only works in groups!',
                quoted: msg 
            });
        }

        // Get group metadata and participants
        const groupInfo = await sock.groupMetadata(from);
        const participants = groupInfo.participants;

        // Check if the sender is an admin
        const senderId = msg.author || msg.from;
        const isSenderAdmin = participants.some(p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin'));
        if (!isSenderAdmin) {
            return sock.sendMessage(from, { 
                text: '❌ You need to be an admin to tag members.',
                quoted: msg 
            });
        }

        // Get the IDs of all participants to mention them
        const mentions = participants.map(p => p.id);

        // Add custom stylish message with more visual appeal
        const customMessage = `*🚨 Urgent Announcement! 🚨*\n\n` +
            `⚡️ *Meeting at 4 PM sharp* ⚡️\n\n` +
            `⏰ *Don't miss it!* ⏰\n\n` +
            `💬 *Please be on time and ready!* 💬\n\n` +
            `*📅 Date:* *Today*`;

        // Stylish list of names with some formatting
        const namesList = participants
            .map((p, i) => `🔹 *${i + 1}. @${p.id.split('@')[0]}*`)
            .join('\n');

        // Send the message mentioning everyone in the group
        await sock.sendMessage(from, {
            text: `${customMessage}\n\n*💬 Attendees:*\n\n${namesList}`,
            mentions,
            contextInfo: {
                mentionedJid: mentions
            }
        }, { quoted: msg });
    } catch (error) {
        console.error('Error in tagAll:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to tag members. Something went wrong.',
            quoted: msg 
        });
    }
}

export const description = "Tags all group members with a custom, stylish message (Admin only)";
