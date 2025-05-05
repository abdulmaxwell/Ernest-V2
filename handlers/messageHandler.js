import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import figlet from 'figlet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global command storage
const commands = {};
export const commandDescriptions = {};

// Load all commands dynamically
export const loadCommands = async () => {
    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands'))
        .filter(file => file.endsWith('.js') && !file.startsWith('_'));

    for (const file of commandFiles) {
        try {
            const module = await import(`../commands/${file}`);
            const commandName = path.basename(file, '.js');
            commands[commandName] = module.default;
            
            if (module.description) {
                commandDescriptions[commandName] = module.description;
            }
        } catch (error) {
            console.error(`Error loading command ${file}:`, error);
        }
    }
    return commands;
};

export const messageHandler = async (sock) => {
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

                if (!text || !text.startsWith(prefix)) continue;

                const args = text.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                const command = commandList[commandName];

                if (command) {
                    await command(sock, msg, from, args);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        }
    });
};