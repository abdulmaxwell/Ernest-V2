import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config(); // Load .env vars

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = {}; // Command execution functions
export const commandDescriptions = {}; // Optional metadata like descriptions

// Emoji map for different command categories
const commandEmojis = {
    // System commands
    'help': 'ℹ️',
    'ping': '🏓',
    'info': '📊',
    
    // Moderation commands
    'ban': '🔨',
    'kick': '👢',
    'mute': '🔇',
    
    // Fun commands
    'joke': '😂',
    'meme': '🖼️',
    'quote': '💬',
    
    // Utility commands
    'weather': '☀️',
    'time': '🕒',
    'calc': '🧮',
    
    // Default fallback
    '_default': '✅'
};

// Dynamically load commands
export const loadCommands = async () => {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(
        file => file.endsWith('.js') && !file.startsWith('_')
    );

    for (const file of commandFiles) {
        const modulePath = pathToFileURL(path.join(commandsPath, file)).href;

        try {
            const module = await import(modulePath);
            const commandName = path.basename(file, '.js');

            if (typeof module.default === 'function') {
                commands[commandName] = module.default;

                if (module.default.description) {
                    commandDescriptions[commandName] = module.default.description;
                }

                // Allow commands to specify their own emoji
                if (module.default.emoji) {
                    commandEmojis[commandName] = module.default.emoji;
                }
            } else {
                console.warn(`Skipping ${file}: No default export found.`);
            }
        } catch (error) {
            console.error(`❌ Failed to load command '${file}':`, error);
        }
    }

    return commands;
};

// Presence management functions
const handlePresence = async (sock, msg, presenceSettings) => {
    if (!presenceSettings.TYPING && !presenceSettings.AUDIO) return;

    const from = msg.key.remoteJid;
    const presenceType = presenceSettings.AUDIO ? 'recording' : 'composing';

    try {
        // Show typing/recording indicator
        await sock.sendPresenceUpdate(presenceType, from);
        
        // Hide the indicator after 3 seconds
        setTimeout(async () => {
            try {
                await sock.sendPresenceUpdate('paused', from);
            } catch (error) {
                console.error('Error hiding presence:', error);
            }
        }, 3000);
    } catch (error) {
        console.error('Error setting presence:', error);
    }
};

// Main message handler
export const messageHandler = async (sock, afkUsers, presenceSettings = {
    TYPING: false,
    AUDIO: false,
    ALWAYS_ONLINE: false
}) => {
    if (sock._messageHandlerRegistered) return;
    sock._messageHandlerRegistered = true;

    const commandList = await loadCommands();
    const prefix = process.env.PREFIX || '!';

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            try {
                const from = msg.key.remoteJid;
                if (!from) continue;

                const text = msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.buttonsResponseMessage?.selectedButtonId;

                if (!text) continue;

                // Handle AFK users first
                if (afkUsers.has(from)) {
                    const afkData = afkUsers.get(from);
                    const timeAway = Math.floor((Date.now() - afkData.timestamp) / 1000);
                    await sock.sendMessage(from, {
                        text: `*${afkData.name}* is currently AFK (${timeAway}s ago)\nReason: ${afkData.reason}`
                    });
                    afkUsers.delete(from);
                }

                if (!text.startsWith(prefix)) continue;

                // Handle presence indicators if enabled
                await handlePresence(sock, msg, presenceSettings);

                const args = text.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                const command = commandList[commandName];

                if (command) {
                    await command(sock, msg, from, args);
                    
                    // Get appropriate emoji for this command
                    const reactionEmoji = commandEmojis[commandName] || 
                                       (command.emoji ? command.emoji : commandEmojis._default);
                    
                    // React to the command message
                    await sock.sendMessage(from, {
                        react: {
                            text: reactionEmoji,
                            key: msg.key
                        }
                    });
                } else {
                    console.log(`🚫 Unknown command: ${commandName}`);
                    // React with warning emoji for unknown commands
                    await sock.sendMessage(from, {
                        react: {
                            text: '⚠️',
                            key: msg.key
                        }
                    });
                }
            } catch (err) {
                console.error('⚠️ Error handling message:', err);
                // React with error emoji if something fails
                try {
                    await sock.sendMessage(from, {
                        react: {
                            text: '❌',
                            key: msg.key
                        }
                    });
                } catch (e) {
                    console.error('Failed to send error reaction:', e);
                }
            }
        }
    });
};

// Export the full command map
export const commandMap = commands;