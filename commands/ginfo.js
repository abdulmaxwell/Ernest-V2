const groupPattern = /https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]{22})/g;

export default async function ginfo(sock, msg, from, args) {
    try {
        console.log("🔍 Starting group info fetch...");
        
        // Get group link from args or quoted message
        let groupLink = args[0];
        
        if (!groupLink && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedText = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
                             msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text;
            groupLink = quotedText;
        }
        
        if (!groupLink) {
            console.log("❌ No group link provided");
            return sock.sendMessage(from, { 
                text: "❗ *Please provide a group invite link.*\n\nExample: `.ginfo https://chat.whatsapp.com/ABC123...`" 
            }, { quoted: msg });
        }

        console.log("🔗 Checking link:", groupLink);

        // Extract invite code more reliably
        const match = groupLink.match(/https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]{22})/);
        
        if (!match) {
            console.log("❌ Invalid group link format");
            return sock.sendMessage(from, { 
                text: "⚠️ *That doesn't look like a valid WhatsApp group link.*\n\nMake sure it looks like: `https://chat.whatsapp.com/ABC123...`" 
            }, { quoted: msg });
        }

        const inviteCode = match[1];
        console.log("🔑 Extracted invite code:", inviteCode);

        // Fetch group info with better error handling
        console.log("📡 Fetching group info...");
        const groupInfo = await sock.groupGetInviteInfo(inviteCode);

        if (!groupInfo) {
            console.log("❌ No group info returned");
            return sock.sendMessage(from, { 
                text: "🚫 *Could not retrieve group info.*\n\nPossible reasons:\n• Link expired\n• Group deleted\n• Invalid invite code" 
            }, { quoted: msg });
        }

        console.log("✅ Group info received:", JSON.stringify(groupInfo, null, 2));

        // Format creation date safely
        let formattedDate = 'Unknown';
        if (groupInfo.creation) {
            try {
                const creationDate = new Date(groupInfo.creation * 1000);
                formattedDate = creationDate.toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (dateError) {
                console.log("⚠️ Date formatting error:", dateError);
            }
        }

        // Format owner info safely
        let ownerInfo = 'Unknown';
        let ownerJid = null;
        if (groupInfo.owner) {
            ownerJid = groupInfo.owner;
            const ownerNumber = groupInfo.owner.split('@')[0];
            ownerInfo = `wa.me/${ownerNumber}`;
        }

        // Build info text
        const infoText = `👥 *${groupInfo.subject || 'Unknown Group'}*\n\n` +
            `👤 *Creator:* ${ownerInfo}\n` +
            `🆔 *Group ID:* \`${groupInfo.id || 'Unknown'}\`\n` +
            `🔕 *Announcements Only:* ${groupInfo.announce ? "Yes" : "No"}\n` +
            `🔒 *Edit Restricted:* ${groupInfo.restrict ? "Yes" : "No"}\n` +
            `📅 *Created:* ${formattedDate}\n` +
            `👥 *Participants:* ${groupInfo.size || 'Unknown'}\n` +
            (groupInfo.desc ? `\n📝 *Description:*\n${groupInfo.desc.trim()}` : '');

        console.log("📤 Sending group info...");
        
        return await sock.sendMessage(from, {
            text: infoText.trim(),
            mentions: ownerJid ? [ownerJid] : []
        }, { quoted: msg });

    } catch (error) {
        console.error("❌ ginfo error:", error);
        console.error("❌ Error stack:", error.stack);
        
        let errorMsg = "❌ *Something went wrong while fetching group info.*\n\n";
        
        if (error.message?.includes('not-authorized')) {
            errorMsg += "_Error:_ Not authorized to access this group info.";
        } else if (error.message?.includes('item-not-found')) {
            errorMsg += "_Error:_ Group not found or invite link expired.";
        } else {
            errorMsg += `_Error:_ ${error.message || error}`;
        }
        
        return sock.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
}

export const description = "Fetches detailed info about a WhatsApp group via invite link";
export const category = "group";

ginfo.description = description;
ginfo.category = category;