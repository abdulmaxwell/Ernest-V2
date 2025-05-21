export default async function del(sock, m) {
    const jid = m.key.remoteJid;
    
    try {
        // Use current message as reference
        await sock.chatModify({
            delete: true,
            lastMessages: [{
                key: m.key,
                messageTimestamp: m.messageTimestamp
            }]
        }, jid);
        
        await sock.sendMessage(
            jid,
            { text: "🧹 Messages cleared" },
            { quoted: m }
        );
    } catch (error) {
        console.error('Delete error:', error);
        await sock.sendMessage(
            jid,
            { text: "❌ Failed to delete messages" },
            { quoted: m }
        );
    }
}

export const description = "Clears messages in current chat";
export const category = "moderation";

del.description = description;
del.category = category;