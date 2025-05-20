import { ownerNumber } from "../config.js";
import { isOwner } from "../lib/utils.js";

export default async function newgc(sock, msg, from, args) {
    try {
        const sender = msg.sender;
        const isBotOwner = isOwner(sender);

        if (!isBotOwner) {
            return sock.sendMessage(from, { 
                text: "❌ Only the *bot owner* can use this command." 
            }, { quoted: msg });
        }

        if (!args[0]) {
            return sock.sendMessage(from, {
                text: "*_⚠️ Provide a name to create a new group!_*\nExample:\n``` .newgc My Cool Group @user1,2...```"
            }, { quoted: msg });
        }

        let groupName = args.join(' ');

        // If "info" keyword
        if (groupName.toLowerCase() === "info") {
            return sock.sendMessage(from, {
                text: "📌 *Usage of .newgc command:*\n\n• Create a group:\n``` .newgc My New Group ```\n\n• Mention or reply to users to add them:\n``` .newgc My New Group @user ```"
            }, { quoted: msg });
        }

        // Remove @mentions from group name
        groupName = groupName.replace(/@\d+/g, "").trim();

        // Safety check: no empty name
        if (!groupName) {
            return sock.sendMessage(from, { 
                text: "❌ Group name can't be empty after removing mentions." 
            }, { quoted: msg });
        }

        let participants = [sender];

        if (msg.quoted?.sender) {
            participants.push(msg.quoted.sender);
        }

        if (msg.mentionedJid?.length) {
            participants.push(...msg.mentionedJid);
        }

        // Remove duplicate IDs
        participants = [...new Set(participants)];

        // Trim group name max length to 60 chars
        const finalGroupName = groupName.substring(0, 60);

        // Create group
        const group = await sock.groupCreate(finalGroupName, participants);

        if (group?.id) {
            const userName = msg.pushName || "Master";
            await sock.sendMessage(group.id, {
                text: `🎉 *Welcome ${userName}!* Your group *"${finalGroupName}"* is live! 🚀\n${global.Config?.caption || ""}`
            });

            try {
                const inviteCode = await sock.groupInviteCode(group.id);
                const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

                return sock.sendMessage(from, {
                    text: `✅ *New group created successfully!*\n📎 *Invite link:*\n${inviteLink}`
                }, { quoted: msg });

            } catch (inviteError) {
                console.error("⚠️ Failed to fetch invite link:", inviteError);
                return sock.sendMessage(from, {
                    text: "✅ *Group created!*\n(But couldn't get the invite link.)"
                }, { quoted: msg });
            }
        } else {
            return sock.sendMessage(from, {
                text: "❌ Failed to create the group. Please try again later."
            }, { quoted: msg });
        }

    } catch (error) {
        console.error("❌ Error in newgc command:", error);
        return sock.sendMessage(from, {
            text: "❌ *Unexpected error occurred while creating the group.*"
        }, { quoted: msg });
    }
}

export const description = "Create a new WhatsApp group and optionally add people";
export const category = "group";

newgc.description = "create new group";
newgc.category = "group";