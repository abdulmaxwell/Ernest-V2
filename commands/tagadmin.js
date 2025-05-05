export default async function tagAdmin(sock, msg, from) {
    if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, { text: '❌ This command only works in groups!' });
    }

    try {
        const groupInfo = await sock.groupMetadata(from);
        const admins = groupInfo.participants.filter(p => p.admin).map(p => p.id);
        
        await sock.sendMessage(from, {
            text: '👑 Attention admins!',
            mentions: admins
        }, { quoted: msg });
    } catch (error) {
        console.error('Error in tagAdmin:', error);
        await sock.sendMessage(from, { text: '❌ Failed to tag admins' }, { quoted: msg });
    }
}

export const description = "Tags all group admins";