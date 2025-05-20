import { ownerNumbers } from "../config.js";

export function isOwner(jid = "") {
    const id = jid.split("@")[0];
    return id === ownerNumbers || jid === ownerNumber;
}
export async function isUserAdmin(sock, groupId, userId) {
    const metadata = await sock.groupMetadata(groupId);
    const participant = metadata.participants.find(p => p.id === userId);
    return participant?.admin !== null && participant?.admin !== undefined;
}

export async function isBotAdmin(sock, groupId) {
    const metadata = await sock.groupMetadata(groupId);
    const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const participant = metadata.participants.find(p => p.id === botId);
    return participant?.admin !== null && participant?.admin !== undefined;
}
