const groupPattern = /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{22}/g;

export default async function ginfo(sock, msg, from, args) {
    try {
        const groupLink = args[0] || msg.reply_text;

        // Check if groupLink is valid
        if (!groupLink) {
            return sock.sendMessage(from, { text: "*_Uhh Please, provide group link_*" }, { quoted: msg });
        }

        const matchedLinks = groupLink.match(groupPattern) || false;

        if (!matchedLinks) {
            return sock.sendMessage(from, { text: "*_Uhh Please, provide valid group link_*" }, { quoted: msg });
        }

        const inviteCode = matchedLinks[0].split("https://chat.whatsapp.com/")[1].trim();
        const groupInfo = await sock.groupGetInviteInfo(inviteCode);

        if (groupInfo) {
            const creationDate = new Date(groupInfo.creation * 1000);
            const formattedDate = creationDate.getFullYear() + "-" + 
                (creationDate.getMonth() + 1).toString().padStart(2, "0") + "-" + 
                creationDate.getDate().toString().padStart(2, "0");

            const infoText = `${groupInfo.subject}\n\n` +
                `Creator: wa.me/${groupInfo.owner.split("@")[0]}\n` +
                `GJid: \`\`\`${groupInfo.id}\`\`\`\n` +
                `*Muted:* ${groupInfo.announce ? "yes" : "no"}\n` +
                `*Locked:* ${groupInfo.restrict ? "yes" : "no"}\n` +
                `*createdAt:* ${formattedDate}\n` +
                `*participants:* ${groupInfo.size > 3 ? groupInfo.size + "th" : groupInfo.size}\n` +
                (groupInfo.desc ? `*description:* ${groupInfo.desc}\n` : "") +
                `\n`;  // Removed Config.caption

            return sock.sendMessage(from, { 
                text: infoText,
                mentions: [groupInfo.owner]
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { 
                text: "*_Group Id not found, Sorry!!_*" 
            }, { quoted: msg });
        }
    } catch (error) {
        await sock.sendMessage(from, { 
            text: "*_Group Id not found, Sorry!!_*\n\nError: " + error 
        }, { quoted: msg });
    }
}

export const description = "Get group info by invite link";
