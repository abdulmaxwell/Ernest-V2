import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config(); // Load .env vars

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = {}; // Command execution functions
export const commandDescriptions = {}; // Optional metadata like descriptions

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
            } else {
                console.warn(`Skipping ${file}: No default export found.`);
            }
        } catch (error) {
            console.error(`❌ Failed to load command '${file}':`, error);
        }
    }

    return commands;
};

// Main message handler
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
                    // React to the command message
                    await sock.sendMessage(from, {
                        react: {
                            text: '🧩', // or change per command using a map
                            key: msg.key
                        }
                    });

                } else {
                    console.log(`🚫 Unknown command: ${commandName}`);
                }
            } catch (err) {
                console.error('⚠️ Error handling message:', err);
            }
        }
    });
};

// Export the full command map
export const commandMap = commands;
