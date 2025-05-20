import { isBotAdmin, isUserAdmin } from "../lib/utils.js";

export default async function mute(sock, msg, from, args) {
    if (!from.endsWith('@g.us')) {
        return sock.sendMessage(from, { text: '❌ This command only works in groups!' }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(from);
    const user = msg.sender;
    const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

    const botIsAdmin = await isBotAdmin(sock, from);
    const userIsAdmin = await isUserAdmin(sock, from, user);

    if (!userIsAdmin) {
        return sock.sendMessage(from, { text: '🛑 Only group admins can mute the group!' }, { quoted: msg });
    }

    if (!botIsAdmin) {
        return sock.sendMessage(from, { text: '⚠️ I need to be an admin to mute the group!' }, { quoted: msg });
    }

    try {
        const duration = parseInt(args[0]) || 60;
        await sock.groupSettingUpdate(from, 'announcement');

        await sock.sendMessage(from, {
            text: `🔇 Group has been muted for *${duration} minutes*.\nOnly admins can send messages now.`
        }, { quoted: msg });

        // Optional: auto unmute after duration
        setTimeout(async () => {
            try {
                await sock.groupSettingUpdate(from, 'not_announcement');
                await sock.sendMessage(from, { text: '🔔 Group has been unmuted. Everyone can chat again!' });
            } catch (err) {
                console.error("Failed to unmute group after timeout:", err);
            }
        }, duration * 60000); // convert minutes to ms

    } catch (error) {
        console.error('Error in mute:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to mute group.',
            quoted: msg
        });
    }
}

export const description = "Mute the group for a set time (admins only)";
export const category = "group";

mute.description = "mute group";
mute.category = "group";