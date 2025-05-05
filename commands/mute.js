export default async function mute(sock, msg, from, args) {
    if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, { text: '❌ This command only works in groups!' });
    }

    try {
        const duration = args[0] || '60'; // Default 60 minutes
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: `🔇 Group muted for ${duration} minutes` }, { quoted: msg });
    } catch (error) {
        console.error('Error in mute:', error);
        await sock.sendMessage(from, { text: '❌ Failed to mute group' }, { quoted: msg });
    }
}

export const description = "Mutes the group (admins only)";