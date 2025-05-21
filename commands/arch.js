export default async function arch(sock, m) {
    const jid = m.key.remoteJid;
    
    try {
        // Simple archive without lastMessages
        await sock.chatModify({ 
            archive: true 
        }, jid);
        
        await sock.sendMessage(
            jid,
            { text: "✅ Chat archived" },
            { quoted: m }
        );
    } catch (error) {
        console.error('Archive error:', error);
        await sock.sendMessage(
            jid,
            { text: "❌ Failed to archive chat" },
            { quoted: m }
        );
    }
}

export const description = "Archives current chat";
export const category = "utility";

arch.description = description;
arch.category = category;