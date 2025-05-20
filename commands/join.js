export default async function join(sock, msg, from, args) {
    try {
        // If the message contains a group invite message (like forwarded or replied)
        if (msg.message?.groupInviteMessage) {
            const inviteCode = msg.message.groupInviteMessage.inviteCode;
            await sock.groupAcceptInvite(inviteCode);
            return sock.sendMessage(from, { text: "*✅ Joined the group successfully!*" }, { quoted: msg });
        }

        // Try to extract link from args or replied message text
        const textInput = args[0] || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || '';
        const match = textInput.match(/chat\.whatsapp\.com\/([0-9A-Za-z]{22})/);
        
        if (!match) {
            return sock.sendMessage(from, { text: "❌ Please provide a valid WhatsApp group invite link!" }, { quoted: msg });
        }

        const inviteCode = match[1];
        await sock.groupAcceptInvite(inviteCode);
        await sock.sendMessage(from, { text: "✅ Successfully joined the group!" }, { quoted: msg });

    } catch (error) {
        console.error("❌ Join Error:", error);
        await sock.sendMessage(from, { 
            text: `❌ Failed to join the group!\n\nReason: ${error.message || error}`, 
        }, { quoted: msg });
    }
}

export const description = "Joins a WhatsApp group using a valid invite link";
export const category = "group";

join.description = "joins group";
join.category = "group";


// import { parsedJid } from "../lib";

// export default async function join(sock, msg, from, args) {
//     try {
//         if (msg.reply_message && msg.reply_message.groupInvite) {
//             const joinResult = await sock.groupAcceptInviteV4(from, msg.reply_message.msg);
//             if (joinResult && joinResult.includes("joined to:")) {
//                 return await sock.sendMessage(from, { text: "*_Joined_*" }, { quoted: msg });
//             }
//         }

//         const groupLink = args[0] || msg.reply_text;
//         const groupPattern = /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{22}/g;
//         const matchedLinks = groupLink.match(groupPattern);

//         if (!matchedLinks) {
//             return await sock.sendMessage(from, { text: "*_Uhh Please, provide group link_*" }, { quoted: msg });
//         }

//         const inviteCode = matchedLinks[0].split("https://chat.whatsapp.com/")[1].trim();
//         await sock.groupAcceptInvite(inviteCode)
//             .then(() => sock.sendMessage(from, { text: "*_Joined_*" }, { quoted: msg }))
//             .catch(() => sock.sendMessage(from, { text: "*_Can't Join, Group Id not found!!_*" }, { quoted: msg }));

//     } catch (error) {
//         await sock.sendMessage(from, { 
//             text: "*_Can't Join, Group Id not found, Sorry!!_*\n\nError: " + error 
//         }, { quoted: msg });
//     }
// }

// export const description = "Joins group by invite link";