import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core data structures
const commands = {};
export const commandDescriptions = {};
const cooldowns = new Map();
const userActivity = new Map();

// Enhanced emoji system (simplified)
const commandEmojis = {
    // System
    'help': 'ℹ️', 'ping': '🏓', 'info': '📊',
    
    // Moderation
    'ban': '🔨', 'kick': '👢', 'mute': '🔇',
    
    // Fun
    'joke': '😂', 'meme': '🖼️', 'quote': '💬',
    
    // Utility
    'weather': '☀️', 'time': '🕒', 'calc': '🧮',
    
    // Reactions
    '_success': '✅', '_error': '❌', '_default': '✨'
};

// Simplified command loader
export const loadCommands = async () => {
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
        console.warn('⚠️ Commands directory not found');
        return commands;
    }

    const commandFiles = fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.js') && !file.startsWith('_'));

    for (const file of commandFiles) {
        const commandName = path.basename(file, '.js');
        const modulePath = pathToFileURL(path.join(commandsPath, file));

        try {
            const module = await import(modulePath);
            
            if (typeof module.default === 'function') {
                commands[commandName] = module.default;
                
                // Store metadata if provided
                if (module.default.description) {
                    commandDescriptions[commandName] = {
                        description: module.default.description,
                        usage: module.default.usage || `${process.env.PREFIX || '!'}${commandName}`,
                        emoji: module.default.emoji || commandEmojis._default
                    };
                }
                
                console.log(`✅ Loaded command: ${commandName}`);
            }
        } catch (error) {
            console.error(`❌ Failed to load ${file}:`, error.message);
        }
    }

    return commands;
};

// Smart presence management (simplified)
const handlePresence = async (sock, from, commandName) => {
    try {
        // Only show presence for complex commands
        const complexCommands = ['weather', 'search', 'translate'];
        if (!complexCommands.includes(commandName)) return;

        await sock.sendPresenceUpdate('composing', from);
        
        // Hide after random delay (1-3s)
        setTimeout(async () => {
            try {
                await sock.sendPresenceUpdate('paused', from);
            } catch (error) {
                console.error('Error hiding presence:', error);
            }
        }, 1000 + Math.random() * 2000);
    } catch (error) {
        console.error('Presence error:', error);
    }
};

// Cooldown system (essential)
const checkCooldown = (userId, commandName) => {
    const cooldownKey = `${userId}-${commandName}`;
    const lastUsed = cooldowns.get(cooldownKey) || 0;
    const cooldownTime = 3000; // 3 seconds

    if (Date.now() - lastUsed < cooldownTime) {
        return false;
    }

    cooldowns.set(cooldownKey, Date.now());
    return true;
};

// Enhanced but simple message handler
export const messageHandler = async (sock, afkUsers, presenceSettings = {
    TYPING: true,
    AUDIO: false
}) => {
    if (sock._messageHandlerRegistered) return;
    sock._messageHandlerRegistered = true;

    const commandList = await loadCommands();
    const prefix = process.env.PREFIX || '!';

    console.log(`🤖 Handler ready with prefix "${prefix}" (${Object.keys(commandList).length} commands)`);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            const from = msg.key.remoteJid;
            if (!from || msg.key.fromMe) continue;

            try {
                const text = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || 
                           '';

                // Handle AFK users
                if (afkUsers.has(from) && text.startsWith(prefix)) {
                    const afkData = afkUsers.get(from);
                    const timeAway = Math.floor((Date.now() - afkData.timestamp) / 1000);
                    await sock.sendMessage(from, {
                        text: `⏳ ${afkData.name} is AFK (${timeAway}s)\n💬 Reason: ${afkData.reason}`
                    });
                    afkUsers.delete(from);
                }

                if (!text.startsWith(prefix)) continue;

                const args = text.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                const command = commandList[commandName];

                if (!command) {
                    await sock.sendMessage(from, {
                        react: { text: '⚠️', key: msg.key }
                    });
                    return;
                }

                // Check cooldown
                const userId = msg.key.participant || from;
                if (!checkCooldown(userId, commandName)) {
                    await sock.sendMessage(from, {
                        text: '⏳ Please wait before using this command again',
                        react: { text: '🕒', key: msg.key }
                    });
                    return;
                }

                // Track activity
                userActivity.set(userId, {
                    lastCommand: commandName,
                    timestamp: Date.now()
                });

                // Handle presence
                if (presenceSettings.TYPING) {
                    await handlePresence(sock, from, commandName);
                }

                // Execute command
                await command(sock, msg, from, args);

                // Send success reaction
                const emoji = commandDescriptions[commandName]?.emoji || commandEmojis._success;
                await sock.sendMessage(from, {
                    react: { text: emoji, key: msg.key }
                });

            } catch (error) {
                console.error(`💥 Command error:`, error.stack || error);
                
                try {
                    await sock.sendMessage(from, {
                        react: { text: commandEmojis._error, key: msg.key },
                        text: `❌ Error executing command: ${error.message}`
                    });
                } catch (e) {
                    console.error('Failed to send error:', e);
                }
            }
        }
    });
};

// Export utilities
export const commandMap = commands;
export const getCooldowns = () => Object.fromEntries(cooldowns);
export const getActivity = () => Object.fromEntries(userActivity);