const afkUsers = new Map();

export default async function afk(sock, msg, from, args = []) {
    try {
        const userId = msg.key.participant || msg.key.remoteJid;
        const reason = args.length > 0 ? args.join(' ') : 'No reason provided';
        
        afkUsers.set(userId, {
            time: Date.now(),
            reason: reason
        });
        
        await sock.sendMessage(from, { 
            text: `⏳ You are now AFK: ${reason}`,
            quoted: msg 
        });
    } catch (error) {
        console.error('Error in afk:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to set AFK status',
            quoted: msg 
        });
    }
}

export const description = "Sets your AFK status";