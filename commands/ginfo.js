const groupPattern = /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{22}/g;

export default async function ginfo(sock, msg, from, args) {
    try {
        const groupLink = args[0] || msg.reply_text;

        if (!groupLink) {
            return sock.sendMessage(from, { text: "❗ *Please provide a group invite link.*" }, { quoted: msg });
        }

        const matchedLinks = groupLink.match(groupPattern);

        if (!matchedLinks) {
            return sock.sendMessage(from, { text: "⚠️ *That doesn't look like a valid WhatsApp group link.*" }, { quoted: msg });
        }

        const inviteCode = matchedLinks[0].split("https://chat.whatsapp.com/")[1].trim();
        const groupInfo = await sock.groupGetInviteInfo(inviteCode);

        if (!groupInfo) {
            return sock.sendMessage(from, { text: "🚫 *Could not retrieve group info.*" }, { quoted: msg });
        }

        const creationDate = new Date(groupInfo.creation * 1000);
        const formattedDate = creationDate.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });

        const owner = groupInfo.owner ? `wa.me/${groupInfo.owner.split('@')[0]}` : 'Unknown';

        const infoText = `👥 *${groupInfo.subject}*\n\n` +
            `👤 *Creator:* ${owner}\n` +
            `🆔 *Group ID:* \`\`\`${groupInfo.id}\`\`\`\n` +
            `🔕 *Muted:* ${groupInfo.announce ? "Yes" : "No"}\n` +
            `🔒 *Locked:* ${groupInfo.restrict ? "Yes" : "No"}\n` +
            `📅 *Created On:* ${formattedDate}\n` +
            `👤 *Participants:* ${groupInfo.size}\n` +
            (groupInfo.desc ? `📝 *Description:* ${groupInfo.desc}\n` : '');

        return sock.sendMessage(from, {
            text: infoText.trim(),
            mentions: groupInfo.owner ? [groupInfo.owner] : []
        }, { quoted: msg });

    } catch (error) {
        console.error("ginfo error:", error);
        return sock.sendMessage(from, {
            text: `❌ *Something went wrong while fetching group info.*\n\n_Error:_ ${error.message || error}`,
            quoted: msg
        });
    }
}

export const description = "Fetches detailed info about a WhatsApp group via invite link";
export const category = "group";

ginfo.description = "Fetches detailed info about a WhatsApp group via invite link";
ginfo.category = "group";
