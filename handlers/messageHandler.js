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

// Simple emoji system
const commandEmojis = {
    'help': 'ℹ️', 'ping': '🏓', 'info': '📊',
    'ban': '🔨', 'kick': '👢', 'mute': '🔇',
    'joke': '😂', 'meme': '🖼️', 'quote': '💬',
    'weather': '☀️', 'time': '🕒', 'calc': '🧮',
    'eval': '⚙️', 'exec': '💻', 'restart': '🔄',
    '_success': '✅', '_error': '❌', '_default': '✨'
};

// Command loader (simplified)
export const loadCommands = async () => {
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
        console.warn('Commands directory not found');
        return commands;
    }

    const commandFiles = fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.js') && !file.startsWith('_'));

    console.log(`Loading ${commandFiles.length} commands...`);

    for (const file of commandFiles) {
        const commandName = path.basename(file, '.js');
        const modulePath = pathToFileURL(path.join(commandsPath, file));

        try {
            const module = await import(modulePath);
            
            if (typeof module.default === 'function') {
                commands[commandName] = module.default;
                
                commandDescriptions[commandName] = {
                    description: module.default.description || 'No description',
                    usage: module.default.usage || `${process.env.PREFIX || '!'}${commandName}`,
                    emoji: module.default.emoji || commandEmojis._default,
                    ownerOnly: module.default.ownerOnly || false
                };
            }
        } catch (error) {
            console.error(`Failed to load ${file}:`, error.message);
        }
    }

    console.log(`✅ ${Object.keys(commands).length} commands loaded`);
    return commands;
};

// Owner check (fixed)
const isOwner = (from) => {
    if (!process.env.OWNER_NUMBER) return false;
    
    // Handle different formats
    const cleanFrom = from.replace(/[@s.whatsapp.net@c.us]/g, '');
    const cleanOwner = process.env.OWNER_NUMBER.replace(/[@s.whatsapp.net@c.us@whatsapp.net]/g, '');
    
    console.log(`Owner check: ${cleanFrom} === ${cleanOwner} = ${cleanFrom === cleanOwner}`);
    
    return cleanFrom === cleanOwner;
};

// Process command (no restrictions for regular users)
export const processCommand = async (sock, msg, from, text) => {
    const prefix = process.env.PREFIX || '!';
    
    const args = text.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands[commandName];

    console.log(`🎯 Processing command "${commandName}" from ${from}`);

    if (!command) {
        console.log(`❌ Command "${commandName}" not found`);
        await sock.sendMessage(from, {
            react: { text: '⚠️', key: msg.key }
        });
        return false;
    }

    // Check if owner-only command (only block if command is owner-only AND user is not owner)
    const cmdInfo = commandDescriptions[commandName];
    if (cmdInfo?.ownerOnly && !isOwner(from)) {
        console.log(`🚫 Owner-only command "${commandName}" blocked for ${from}`);
        await sock.sendMessage(from, {
            text: "❌ Owner-only command",
            react: { text: '⛔', key: msg.key }
        });
        return false;
    }

    // Execute command immediately
    try {
        console.log(`🚀 Executing command: ${commandName}`);
        await command(sock, msg, from, args);
        
        const emoji = cmdInfo?.emoji || commandEmojis._success;
        await sock.sendMessage(from, {
            react: { text: emoji, key: msg.key }
        });
        
        console.log(`✅ Command "${commandName}" executed successfully`);
        return true;
    } catch (error) {
        console.error(`❌ Command error [${commandName}]:`, error.message);
        await sock.sendMessage(from, {
            react: { text: commandEmojis._error, key: msg.key }
        });
        return false;
    }
};

// Fast message handler
export const messageHandler = async (sock, afkUsers, presenceSettings = {
    TYPING: true,
    AUDIO: false
}) => {
    if (sock._messageHandlerRegistered) {
        return;
    }
    sock._messageHandlerRegistered = true;

    const prefix = process.env.PREFIX || '!';
    console.log(`🤖 Bot ready with prefix "${prefix}"`);
    console.log(`👑 Owner number: ${process.env.OWNER_NUMBER || 'Not set'}`);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            const from = msg.key.remoteJid;
            if (!from || msg.key.fromMe) continue;

            try {
                const text = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || 
                           '';

                if (!text) continue;

                // Debug log for every message
                console.log(`📨 From: ${from} | Text: "${text}"`);

                // Handle AFK users (simplified)
                if (afkUsers.has(from) && (text.startsWith(prefix) || text.startsWith('#'))) {
                    const afkData = afkUsers.get(from);
                    const timeAway = Math.floor((Date.now() - afkData.timestamp) / 1000);
                    await sock.sendMessage(from, {
                        text: `⏳ ${afkData.name} was AFK (${timeAway}s ago)\n💬 ${afkData.reason}`
                    });
                    afkUsers.delete(from);
                }

                // Handle owner commands (start with #)
                if (text.startsWith('#')) {
                    console.log(`# command detected from ${from}`);
                    if (isOwner(from)) {
                        console.log(`✅ Owner verified, processing command`);
                        await processCommand(sock, msg, from, text.replace('#', prefix));
                    } else {
                        console.log(`❌ Not owner, ignoring # command`);
                    }
                    continue;
                }

                // Handle regular commands - PROCESS FOR EVERYONE
                if (text.startsWith(prefix)) {
                    console.log(`${prefix} command detected from ${from}`);
                    await processCommand(sock, msg, from, text);
                }

            } catch (error) {
                console.error('Message handling error:', error.message);
            }
        }
    });
};

// Export utilities
export const commandMap = commands;