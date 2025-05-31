import { ownerNumber } from "../config.js";
import { isOwner } from "../lib/utils.js";

export default async function newgc(sock, msg, from, args) {
    try {
        const sender = msg.sender || msg.key.participant || msg.key.remoteJid;
        const isBotOwner = isOwner(sender);

        // Owner check
        if (!isBotOwner) {
            return await sock.sendMessage(from, { 
                text: "❌ *Access Denied*\n\n🔒 Only the bot owner can create groups.\n💡 _Contact the owner for group creation requests._" 
            }, { quoted: msg });
        }

        // Help/Info command
        if (!args[0] || args[0].toLowerCase() === "info" || args[0].toLowerCase() === "help") {
            return await sock.sendMessage(from, {
                text: `📋 *New Group Creator - Usage Guide*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `🆕 *Basic Usage:*\n` +
                      `\`\`\`.newgc Group Name\`\`\`\n\n` +
                      `👥 *Add Members:*\n` +
                      `• Reply to someone: Creates group with that person\n` +
                      `• Tag users: \`\`\`.newgc My Group @user1 @user2\`\`\`\n` +
                      `• Combine both methods for multiple adds\n\n` +
                      `📝 *Examples:*\n` +
                      `• \`\`\`.newgc Family Chat\`\`\`\n` +
                      `• \`\`\`.newgc Work Team @john @sarah\`\`\`\n\n` +
                      `⚠️ *Limits:*\n` +
                      `• Group name: Max 60 characters\n` +
                      `• Members: WhatsApp limits apply\n\n` +
                      `🔥 _Powered by Ernest Tech House_`
            }, { quoted: msg });
        }

        // Extract group name
        let groupName = args.join(' ').trim();
        
        // Remove mentions from group name but keep the original for participant extraction
        const originalArgs = args.join(' ');
        groupName = groupName.replace(/@[\d\s]+/g, '').trim();

        // Validate group name
        if (!groupName || groupName.length < 2) {
            return await sock.sendMessage(from, { 
                text: "❌ *Invalid Group Name*\n\n📝 Please provide a proper group name (min 2 characters)\n💡 Example: `.newgc My Awesome Group`" 
            }, { quoted: msg });
        }

        // Limit group name length
        if (groupName.length > 60) {
            groupName = groupName.substring(0, 60);
        }

        // Collect participants
        let participants = [];
        
        // Always include the bot owner
        if (sender) {
            participants.push(sender);
        }

        // Add quoted message sender
        if (msg.quoted?.participant) {
            participants.push(msg.quoted.participant);
        } else if (msg.quoted?.key?.participant) {
            participants.push(msg.quoted.key.participant);
        } else if (msg.quoted?.key?.remoteJid && !msg.quoted.key.remoteJid.endsWith('@g.us')) {
            participants.push(msg.quoted.key.remoteJid);
        }

        // Add mentioned users
        if (msg.mentionedJid && Array.isArray(msg.mentionedJid)) {
            participants.push(...msg.mentionedJid);
        }

        // Clean and validate participants
        participants = participants
            .filter(p => p && typeof p === 'string') // Remove invalid entries
            .map(p => p.includes('@') ? p : `${p}@s.whatsapp.net`) // Ensure proper format
            .filter(p => p.endsWith('@s.whatsapp.net')) // Only individual chats
            .filter((p, index, arr) => arr.indexOf(p) === index); // Remove duplicates

        console.log('Creating group:', { groupName, participants });

        // Create the group
        let group;
        try {
            // Try creating with participants first
            if (participants.length > 1) {
                group = await sock.groupCreate(groupName, participants);
            } else {
                // Create empty group if no valid participants
                group = await sock.groupCreate(groupName, [sender]);
            }
        } catch (createError) {
            console.error('Group creation error:', createError);
            
            // Try with just the owner if participant addition failed
            try {
                group = await sock.groupCreate(groupName, [sender]);
            } catch (fallbackError) {
                console.error('Fallback group creation failed:', fallbackError);
                return await sock.sendMessage(from, {
                    text: `❌ *Group Creation Failed*\n\n🚫 Could not create the group "${groupName}"\n\n` +
                          `💡 *Possible reasons:*\n` +
                          `• Invalid participant numbers\n` +
                          `• WhatsApp rate limiting\n` +
                          `• Network connectivity issues\n\n` +
                          `🔄 _Please try again in a few moments_`
                }, { quoted: msg });
            }
        }

        if (!group || !group.id) {
            return await sock.sendMessage(from, {
                text: "❌ *Creation Failed*\n\n😞 Group creation returned no valid group ID.\n🔄 Please try again later."
            }, { quoted: msg });
        }

        console.log('Group created successfully:', group.id);

        // Send welcome message to the new group
        try {
            const userName = msg.pushName || sender.split('@')[0] || "Owner";
            const welcomeMessage = 
                `🎉 *Welcome to ${groupName}!* 🎉\n\n` +
                `👋 Created by: *${userName}*\n` +
                `🤖 Managed by: *Ernest v2*\n` +
                `📅 Created: ${new Date().toLocaleString()}\n\n` +
                `🚀 _Let's make this group awesome!_\n` +
                `🏆 _Powered by Ernest Tech House_`;

            await sock.sendMessage(group.id, { text: welcomeMessage });
        } catch (welcomeError) {
            console.error('Failed to send welcome message:', welcomeError);
        }

        // Get invite link
        let inviteLink = null;
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for group to be fully created
            const inviteCode = await sock.groupInviteCode(group.id);
            inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        } catch (inviteError) {
            console.error('Failed to get invite link:', inviteError);
        }

        // Send success message
        const successMessage = 
            `✅ *Group Created Successfully!*\n\n` +
            `📋 *Group Name:* ${groupName}\n` +
            `👥 *Members Added:* ${participants.length}\n` +
            `🆔 *Group ID:* \`${group.id}\`\n\n` +
            (inviteLink ? `🔗 *Invite Link:*\n${inviteLink}\n\n` : '') +
            `🎯 *Pro Tip:* You can now manage this group using bot commands!\n` +
            `💪 _Group ready for action!_`;

        return await sock.sendMessage(from, {
            text: successMessage
        }, { quoted: msg });

    } catch (error) {
        console.error("❌ Critical error in newgc command:", error);
        
        // Detailed error response
        const errorCode = error.output?.statusCode || error.status || 'Unknown';
        const errorMessage = error.message || 'Unknown error';
        
        return await sock.sendMessage(from, {
            text: `❌ *System Error*\n\n` +
                  `🔧 *Error Code:* ${errorCode}\n` +
                  `📝 *Details:* ${errorMessage}\n\n` +
                  `🆘 *Solutions:*\n` +
                  `• Check internet connection\n` +
                  `• Verify participant numbers\n` +
                  `• Try with simpler group name\n` +
                  `• Contact support if issue persists\n\n` +
                  `🏠 _Ernest Tech House Support_`
        }, { quoted: msg });
    }
}

// Enhanced metadata
export const description = "Create a new WhatsApp group with advanced member management and error handling";
export const category = "group";

// Legacy support
newgc.description = "Create new WhatsApp group with members";
newgc.category = "group";
newgc.usage = ".newgc <group_name> [@mentions]";
newgc.example = ".newgc My Group @user1 @user2";
newgc.aliases = ["creategroup", "makegroup", "newgroup"];