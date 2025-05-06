import { ownerNumber } from "../config.js"; // or import { isOwner } from "../lib/utils.js"

export default async function newgc(sock, msg, from, args) {
    try {
        if (msg.sender.split("@")[0] !== ownerNumber) {
            return sock.sendMessage(from, { text: "Only bot owner can use this command" }, { quoted: msg });
        }

        if (!args[0]) {
            return sock.sendMessage(from, {
                text: "*_provide Name to Create new Group!!!_*\n*_Ex: .newgc My Name Group @user1,2,3.._*"
            }, { quoted: msg });
        }

        let groupName = args.join(' ');
        if (groupName.toLowerCase() === "info") {
            return sock.sendMessage(from, {
                text: "\n  *It's a command to create a new group*\n  \t```Ex: .newgc My new Group```\n\n*You can also add people in new group*\n  \t```just reply or mention users```\n"
            }, { quoted: msg });
        }

        let participants = [msg.sender];

        if (msg.quoted) {
            participants.push(msg.quoted.sender);
        }

        if (msg.mentionedJid && msg.mentionedJid[0]) {
            participants.push(...msg.mentionedJid);
            try {
                msg.mentionedJid.forEach(jid => {
                    const number = jid.split("@")[0].trim();
                    groupName = groupName.replace(new RegExp("@" + number, "g"), "");
                });
            } catch {}
        }

        const finalGroupName = groupName.substring(0, 60);
        const group = await sock.groupCreate(finalGroupName, participants);

        if (group) {
            await sock.sendMessage(group.id, {
                text: "*_Hey Master, Welcome to the new Group_*\n" + (global.Config?.caption || "")
            });

            try {
                const inviteCode = await sock.groupInviteCode(group.id);
                const inviteLink = "https://chat.whatsapp.com/" + inviteCode;

                return sock.sendMessage(from, {
                    text: "*_Hurray, New group created!!!_*\n" + (inviteCode ? "*_" + inviteLink + "_*" : "")
                }, { quoted: msg });

            } catch {
                return sock.sendMessage(from, {
                    text: "*_Hurray, New group created!!!_*"
                }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(from, {
                text: "*_Can't create new group, Sorry!!_*"
            }, { quoted: msg });
        }
    } catch (error) {
        await sock.sendMessage(from, {
            text: "*_Can't create new group, Sorry!!_*\n\nError: " + error
        }, { quoted: msg });
    }
}

export const description = "Create a new WhatsApp group";
