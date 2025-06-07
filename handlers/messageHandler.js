// messageHandler.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { antidelete } from './antidelete.js';
import { jidNormalizedUser } from '@whiskeysockets/baileys'; // Keep this import!

// Import the new specialAlerts handler
import { handleSpecialAlert } from './specialAlerts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = {};
export const commandDescriptions = {};

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

export const messageHandler = async (sock) => {
    if (sock._messageHandlerRegistered) return;
    sock._messageHandlerRegistered = true;

    const commandList = await loadCommands();
    const prefix = process.env.PREFIX || '!';

    // --- Configuration Variables ---
    const autoReadGeneralEnabled = process.env.AUTO_READ_MESSAGES === 'true';
    const botSignatureEnabled = process.env.BOT_SIGNATURE_ENABLED === 'true';
    const botSignatureText = process.env.BOT_SIGNATURE_TEXT || ' | Bot';

    const autoViewStatusEnabled = process.env.AUTO_VIEW_STATUS_ENABLED === 'true';
    const sendStatusNotificationEnabled = process.env.SEND_STATUS_VIEW_NOTIFICATION_ENABLED === 'true';
    const statusViewNotificationText = process.env.STATUS_VIEW_NOTIFICATION_TEXT || 'Just viewed your status. -Bot';

    const autoViewChannelsEnabled = process.env.AUTO_VIEW_CHANNELS_ENABLED === 'true';
    const autoTypingIndicatorEnabled = process.env.AUTO_TYPING_INDICATOR_ENABLED === 'true';

    // Special Contact Alerts
    const specialContactAlertsEnabled = process.env.SPECIAL_CONTACT_ALERTS && process.env.SPECIAL_CONTACT_ALERTS.length > 0;
    const specialContactJids = specialContactAlertsEnabled
        ? process.env.SPECIAL_CONTACT_ALERTS.split(',').map(num => jidNormalizedUser(`${num}@s.whatsapp.net`))
        : [];
    // --- End Configuration Variables ---

    // --- Emojis for Command Reactions ---
    const reactionEmojis = ['✅', '👍', '✨', '🚀', '🌟', '🤖', '🔥', '🎉', '💡', '💬', '💫', '👍'];
    // --- End Emojis for Command Reactions ---

    // --- Logging Initial States ---
    if (autoReadGeneralEnabled) {
        console.log("INFO: General auto-reading of all incoming messages is ENABLED.");
    } else {
        console.log("INFO: General auto-reading of all incoming messages is DISABLED.");
    }
    if (autoViewStatusEnabled) {
        console.log(`INFO: Auto-viewing status updates is ENABLED.`);
        if (sendStatusNotificationEnabled) {
            console.log(`INFO: Sending notification after status view is ENABLED.`);
        }
    } else {
        console.log("INFO: Auto-viewing status updates is DISABLED.");
    }
    if (autoViewChannelsEnabled) {
        console.log("INFO: Auto-viewing channel updates is ENABLED.");
    } else {
        console.log("INFO: Auto-viewing channel updates is DISABLED.");
    }
    if (autoTypingIndicatorEnabled) {
        console.log("INFO: Auto-typing indicator on incoming messages is ENABLED.");
    } else {
        console.log("INFO: Auto-typing indicator on incoming messages is DISABLED.");
    }
    if (specialContactAlertsEnabled) {
        console.log("INFO: Special contact alerts are ENABLED.");
        console.log("INFO: Special contacts:", specialContactJids.map(jid => jid.split('@')[0]).join(', '));
    } else {
        console.log("INFO: Special contact alerts are DISABLED.");
    }
    // --- End Logging Initial States ---


    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            const from = msg.key.remoteJid;
            if (!from) continue;

            const botJid = sock.user.id; // Get bot's own JID

            // --- Show Typing Indicator Immediately (if enabled and not from bot) ---
            if (autoTypingIndicatorEnabled && !msg.key.fromMe) {
                await sock.sendPresenceUpdate('composing', from);
                console.log(`DEBUG: Sent 'composing' presence to ${from}.`);
            }

            try {
                let messageHandledByAutoFeatures = false; // Flag to know if message was processed by specific auto-features

                // --- 1. Handle Status Messages ---
                if (from === 'status@broadcast') {
                    if (autoViewStatusEnabled) {
                        const statusOwnerJid = msg.key.participant;
                        if (statusOwnerJid && statusOwnerJid !== botJid) {
                            await sock.readMessages([msg.key], 'read');
                            console.log(`DEBUG: Auto-viewed status from ${statusOwnerJid} (ID: ${msg.key.id}).`);

                            if (sendStatusNotificationEnabled) {
                                await sock.sendMessage(statusOwnerJid, { text: statusViewNotificationText });
                                console.log(`DEBUG: Sent status view notification to ${statusOwnerJid}.`);
                            }
                        }
                    }
                    messageHandledByAutoFeatures = true;
                }

                // --- 2. Handle Channel Messages ---
                if (from.endsWith('@newsletter') && !messageHandledByAutoFeatures) {
                    if (autoViewChannelsEnabled) {
                        await sock.readMessages([msg.key], 'read');
                        console.log(`DEBUG: Auto-read channel message from ${from} (ID: ${msg.key.id}).`);
                    }
                    messageHandledByAutoFeatures = true;
                }
                
                // --- 3. Handle General Auto-Read (for all other messages, if not from bot or already handled by status/channel) ---
                if (autoReadGeneralEnabled && !msg.key.fromMe && !messageHandledByAutoFeatures) {
                    await sock.readMessages([msg.key], 'read');
                    console.log(`DEBUG: General auto-read message from ${from} (ID: ${msg.key.id}).`);
                    messageHandledByAutoFeatures = true; // Mark as handled
                }

                // --- 4. Special Contact Alert (only if message is from a special contact and NOT from bot itself) ---
                if (specialContactAlertsEnabled && !msg.key.fromMe) { // We check if specialContactJids includes `from` inside the handler
                    await handleSpecialAlert(sock, msg, from, specialContactJids, botJid);
                }


                // --- 5. Handle Antidelete ---
                await antidelete(sock, msg);

                // --- 6. Handle Commands ---
                const text = msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.buttonsResponseMessage?.selectedButtonId;

                if (!text || !text.startsWith(prefix)) {
                    // If it's not a command, we are done processing this message after auto-reads/views
                    if (autoTypingIndicatorEnabled && !msg.key.fromMe) {
                        await sock.sendPresenceUpdate('paused', from);
                        console.log(`DEBUG: Sent 'paused' presence to ${from} (non-command).`);
                    }
                    continue; // Skip to next message in loop
                }

                const args = text.slice(prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                const command = commandList[commandName];

                if (command) {
                    const originalSendMessage = sock.sendMessage;
                    sock.sendMessage = async (jid, content, options) => {
                        let finalContent = { ...content };
                        if (botSignatureEnabled) {
                            if (finalContent.text) {
                                finalContent.text += botSignatureText;
                            } else if (finalContent.caption) {
                                finalContent.caption += botSignatureText;
                            }
                        }
                        return originalSendMessage.call(sock, jid, finalContent, options);
                    };

                    await command(sock, msg, from, args);
                    sock.sendMessage = originalSendMessage; // Restore original after command execution

                    const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
                    await sock.sendMessage(from, {
                        react: {
                            text: randomEmoji,
                            key: msg.key
                        }
                    });
                    console.log(`DEBUG: Sent reaction ${randomEmoji} for command.`);

                } else {
                    console.log(`🚫 Unknown command: ${commandName}`);
                }

            } catch (err) {
                console.error('⚠️ Error handling message:', err);
                if (autoTypingIndicatorEnabled && !msg.key.fromMe) {
                    await sock.sendPresenceUpdate('paused', from);
                    console.log(`DEBUG: Sent 'paused' presence to ${from} (on error).`);
                }
            }
        }
    });
};

export const commandMap = commands;