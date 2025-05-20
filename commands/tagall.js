export default async function tagAll(sock, msg, from) {
    try {
        // Ensure it's in a group
        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, {
                text: '❌ This command only works in group chats!',
                quoted: msg
            });
        }

        // Get group participants
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;

        // Get sender ID (works even if forwarded)
        const sender = msg.key.participant || msg.key.remoteJid;

        // Check admin rights
        const isAdmin = participants.some(p =>
            p.id === sender && ['admin', 'superadmin'].includes(p.admin)
        );

        if (!isAdmin) {
            return sock.sendMessage(from, {
                text: '❌ Only group admins can use this command.',
                quoted: msg
            });
        }

        // Build mentions and list
        const mentions = participants.map(p => p.id);
        const memberList = participants.map((p, i) => `🔹 *${i + 1}. @${p.id.split('@')[0]}*`).join('\n');

        // Custom message body
        const header = `*🚨 Group Announcement 🚨*`;
        const message = `
${header}

📣 *Attention Everyone!*
Please take a moment to read the announcement carefully.

🕒 *Time:* 4 PM sharp  
📅 *Date:* Today  
📍 *Venue:* This group 😎

💬 *Tag List:*
${memberList}
        `.trim();

        // Send message with mentions
        await sock.sendMessage(from, {
            text: message,
            mentions,
            contextInfo: {
                mentionedJid: mentions
            }
        }, { quoted: msg });

    } catch (err) {
        console.error('tagAll error:', err);
        await sock.sendMessage(from, {
            text: '❌ Failed to tag everyone. Please try again later.',
            quoted: msg
        });
    }
}

export const description = "Tags all group members with a formatted message (Admins only)";
export const category = "group";
tagAll.description = "tag all group members";
tagAll.category = "group";
