import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname in ES module style
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure database directory exists
const databaseDir = path.join(__dirname, '../database');
const afkFilePath = path.join(databaseDir, 'afk.json');


// Create database directory if it doesn't exist
if (!fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir, { recursive: true });
}

// Initialize AFK file if it doesn't exist
if (!fs.existsSync(afkFilePath)) {
    fs.writeFileSync(afkFilePath, JSON.stringify([], null, 2));
}

// Load AFK users from file
function loadAfkUsers() {
    try {
        const data = fs.readFileSync(afkFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading AFK users:', error);
        return [];
    }
}

// Save AFK users to file
function saveAfkUsers(afkUsers) {
    try {
        fs.writeFileSync(afkFilePath, JSON.stringify(afkUsers, null, 2));
    } catch (error) {
        console.error('Error saving AFK users:', error);
    }
}

// Add user to AFK list
function addAfkUser(userId, timestamp, reason, afkUsers) {
    const afkData = {
        id: userId,
        time: timestamp,
        reason: reason
    };
    
    // Remove existing AFK entry if exists
    const existingIndex = afkUsers.findIndex(user => user.id === userId);
    if (existingIndex !== -1) {
        afkUsers.splice(existingIndex, 1);
    }
    
    afkUsers.push(afkData);
    saveAfkUsers(afkUsers);
}

// Check if user is AFK
function checkAfkUser(userId, afkUsers) {
    return afkUsers.some(user => user.id === userId);
}

// Get AFK reason for user
function getAfkReason(userId, afkUsers) {
    const afkUser = afkUsers.find(user => user.id === userId);
    return afkUser ? afkUser.reason : null;
}

// Get AFK time for user
function getAfkTime(userId, afkUsers) {
    const afkUser = afkUsers.find(user => user.id === userId);
    return afkUser ? afkUser.time : null;
}

// Get AFK user ID (for consistency with original code)
function getAfkId(userId, afkUsers) {
    const afkUser = afkUsers.find(user => user.id === userId);
    return afkUser ? afkUser.id : null;
}

// Get AFK user position in array
function getAfkPosition(userId, afkUsers) {
    const index = afkUsers.findIndex(user => user.id === userId);
    return index !== -1 ? index : null;
}

// Remove user from AFK list
function removeAfkUser(userId, afkUsers) {
    const index = afkUsers.findIndex(user => user.id === userId);
    if (index !== -1) {
        afkUsers.splice(index, 1);
        saveAfkUsers(afkUsers);
        return true;
    }
    return false;
}

// Format time duration
function formatTimeDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// AFK command - Set user as AFK
export default async function afk(sock, msg, from, args) {
    try {
        const afkUsers = loadAfkUsers();
        const reason = args.join(' ') || 'No reason provided';
        const timestamp = Date.now();
        
        // Add user to AFK list
        addAfkUser(from, timestamp, reason, afkUsers);
        
        // Get user's name/number for display
        let username = from.split('@')[0];
        try {
            const contact = await sock.onWhatsApp(from);
            if (contact && contact[0] && contact[0].name) {
                username = contact[0].name;
            }
        } catch (error) {
            // Use phone number if name not available
        }
        
        await sock.sendMessage(from, {
            text: `💤 *AFK Mode Activated*\n\n👤 *User:* ${username}\n⏰ *Time:* ${new Date().toLocaleString()}\n💬 *Reason:* ${reason}\n\nI'll notify others when they mention you!`
        });
        
    } catch (error) {
        console.error('AFK command error:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to set AFK status. Please try again.'
        });
    }
}

// Unafk command - Remove user from AFK
export async function unafk(sock, msg, from) {
    try {
        const afkUsers = loadAfkUsers();
        
        if (!checkAfkUser(from, afkUsers)) {
            await sock.sendMessage(from, {
                text: '❌ You are not currently AFK!'
            });
            return;
        }
        
        const afkTime = getAfkTime(from, afkUsers);
        const timeDuration = formatTimeDuration(Date.now() - afkTime);
        
        // Remove user from AFK list
        removeAfkUser(from, afkUsers);
        
        await sock.sendMessage(from, {
            text: `✅ *Welcome back!*\n\n⏱️ You were AFK for: ${timeDuration}\n🎉 AFK status removed!`
        });
        
    } catch (error) {
        console.error('Unafk command error:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to remove AFK status. Please try again.'
        });
    }
}

// List AFK users command
export async function afklist(sock, msg, from) {
    try {
        const afkUsers = loadAfkUsers();
        
        if (afkUsers.length === 0) {
            await sock.sendMessage(from, {
                text: '📋 *AFK Users List*\n\n✅ No users are currently AFK!'
            });
            return;
        }
        
        let afkList = '📋 *AFK Users List*\n\n';
        
        afkUsers.forEach((user, index) => {
            const username = user.id.split('@')[0];
            const timeDuration = formatTimeDuration(Date.now() - user.time);
            
            afkList += `${index + 1}. 👤 *${username}*\n`;
            afkList += `   ⏱️ Duration: ${timeDuration}\n`;
            afkList += `   💬 Reason: ${user.reason}\n\n`;
        });
        
        await sock.sendMessage(from, { text: afkList });
        
    } catch (error) {
        console.error('AFK list command error:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to get AFK users list. Please try again.'
        });
    }
}

// Enhanced message handler function to handle AFK mentions
export function handleAfkMentions(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            const from = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            
            if (!from || msg.key.fromMe) continue;
            
            try {
                const afkUsers = loadAfkUsers();
                const text = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || '';
                
                if (!text) continue;
                
                // Check if sender is AFK and sending a message (auto-remove AFK)
                if (checkAfkUser(sender, afkUsers)) {
                    const afkTime = getAfkTime(sender, afkUsers);
                    const timeDuration = formatTimeDuration(Date.now() - afkTime);
                    
                    removeAfkUser(sender, afkUsers);
                    
                    await sock.sendMessage(from, {
                        text: `👋 Welcome back! You were AFK for ${timeDuration}`
                    });
                }
                
                // Check for mentions of AFK users
                const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                
                for (const mentionedJid of mentionedJids) {
                    if (checkAfkUser(mentionedJid, afkUsers)) {
                        const reason = getAfkReason(mentionedJid, afkUsers);
                        const afkTime = getAfkTime(mentionedJid, afkUsers);
                        const timeDuration = formatTimeDuration(Date.now() - afkTime);
                        const username = mentionedJid.split('@')[0];
                        
                        await sock.sendMessage(from, {
                            text: `💤 *${username} is currently AFK*\n\n⏱️ Duration: ${timeDuration}\n💬 Reason: ${reason}`
                        });
                    }
                }
                
            } catch (error) {
                console.error('AFK mention handling error:', error);
            }
        }
    });
}

// Set command descriptions and emojis
afk.description = "Set yourself as AFK (Away From Keyboard)";
afk.emoji = "💤";
afk.usage = "!afk [reason]";

unafk.description = "Remove your AFK status";
unafk.emoji = "👋";
unafk.usage = "!unafk";

afklist.description = "Show list of current AFK users";
afklist.emoji = "📋";
afklist.usage = "!afklist";

// Export utility functions for other modules
export {
    addAfkUser,
    checkAfkUser,
    getAfkReason,
    getAfkTime,
    getAfkId,
    getAfkPosition,
    removeAfkUser,
    loadAfkUsers,
    saveAfkUsers,
    formatTimeDuration
};

//.afk Going to sleep
//.afk Meeting in progress
//.afk
//.unafk
//.afklist
//import { handleAfkMentions } from './commands/afk.js';

// After initializing your bot
//handleAfkMentions(sock);