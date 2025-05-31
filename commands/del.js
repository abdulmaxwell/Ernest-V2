export default async function del(sock, m) {
    const jid = m.key.remoteJid;
    
    try {
        console.log("🗑️ Attempting to clear chat:", jid);
        
        // Method 1: Try to clear chat history (works for personal chats)
        try {
            await sock.chatModify({ 
                clear: { 
                    messages: [{ 
                        key: m.key, 
                        messageTimestamp: m.messageTimestamp 
                    }] 
                } 
            }, jid);
            
            console.log("✅ Chat cleared using chatModify");
            return await sock.sendMessage(jid, { 
                text: "🧹 Chat history cleared!" 
            });
            
        } catch (clearError) {
            console.log("❌ chatModify clear failed:", clearError.message);
        }
        
        // Method 2: Try to delete recent messages batch
        try {
            await sock.chatModify({
                delete: true,
                lastMessages: [{ 
                    key: m.key, 
                    messageTimestamp: m.messageTimestamp 
                }]
            }, jid);
            
            console.log("✅ Messages deleted using delete method");
            return await sock.sendMessage(jid, { 
                text: "🧹 Recent messages cleared!" 
            });
            
        } catch (deleteError) {
            console.log("❌ chatModify delete failed:", deleteError.message);
        }
        
        // Method 3: Try archive and unarchive (clears for some users)
        try {
            await sock.chatModify({ archive: true }, jid);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.chatModify({ archive: false }, jid);
            
            console.log("✅ Chat archived/unarchived");
            return await sock.sendMessage(jid, { 
                text: "🧹 Chat refreshed!" 
            });
            
        } catch (archiveError) {
            console.log("❌ Archive method failed:", archiveError.message);
        }
        
        // If all methods fail
        throw new Error("All clearing methods failed");
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        await sock.sendMessage(jid, { 
            text: `❌ Could not clear messages.\n\n*Note:* This feature may not work in all chat types or with current permissions.` 
        }, { quoted: m });
    }
}

export const description = "Clears/refreshes messages in current chat";
export const category = "moderation";

del.description = description;
del.category = category;