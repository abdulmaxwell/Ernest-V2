export default async function tagAdmin(sock, msg, from) {
    try {
        // Must be used in a group
        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, {
                text: '❌ This command only works in group chats!',
                quoted: msg
            });
        }

        // Fetch group data and admins
        const groupMeta = await sock.groupMetadata(from);
        const admins = groupMeta.participants.filter(p => p.admin).map(p => p.id);

        if (admins.length === 0) {
            return sock.sendMessage(from, {
                text: '⚠️ No admins found in this group. That’s suspicious...',
                quoted: msg
            });
        }

        // Build admin list text
        const adminList = admins.map((id, i) => `👑 *${i + 1}. @${id.split('@')[0]}*`).join('\n');

        const finalMsg = `
*📢 Calling All Admins!*

This is a summon from above 🔔  
We need your royal presence in this matter.  
Please attend immediately.

🛡️ *Admins:*
${adminList}
        `.trim();

        await sock.sendMessage(from, {
            text: finalMsg,
            mentions: admins,
            contextInfo: {
                mentionedJid: admins
            }
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in tagAdmin:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to tag admins. Something broke in the matrix.',
            quoted: msg
        });
    }
}

export const description = "Tags all group admins with a stylish message";
export const category = "group";

tagAdmin.description = "tags all group admins with a stylish message";
tagAdmin.category = "group";
