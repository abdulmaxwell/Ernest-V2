export default async function tagAll(sock, msg, from) {
    try {
        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { 
                text: '❌ This command only works in groups!',
                quoted: msg 
            });
        }

        const groupInfo = await sock.groupMetadata(from);
        const mentions = groupInfo.participants.map(p => p.id);
        
        await sock.sendMessage(from, {
            text: '📢 *Attention everyone!*',
            mentions: mentions
        }, { quoted: msg });
    } catch (error) {
        console.error('Error in tagAll:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to tag members. Make sure I\'m admin.',
            quoted: msg 
        });
    }
}

export const description = "Tags all group members (Admin only)";