import { config } from 'dotenv';
config();

import {
    generateForwardMessageContent,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    getContentType
} from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Load identity mappings from JSON file
function loadIdentityMappings() {
    try {
        const identityPath = path.join(process.cwd(), 'identities.json');
        if (!fs.existsSync(identityPath)) {
            // Create default file if it doesn't exist
            const defaultMappings = {
                "1234": "1234567890@s.whatsapp.net",
                "admin": "0987654321@s.whatsapp.net",
                "test": "1111111111@s.whatsapp.net"
            };
            fs.writeFileSync(identityPath, JSON.stringify(defaultMappings, null, 2));
            return defaultMappings;
        }
        
        const data = fs.readFileSync(identityPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading identity mappings:', error);
        return {};
    }
}

// Animated loading messages
const loadingMessages = [
    '🚀 Initializing targeted messaging...',
    '📡 Connecting to secure channels...',
    '🎯 Locating target recipient...',
    '⚡ Establishing encrypted connection...',
    '🌍 Routing through global network...',
    '💫 Preparing secure transmission...'
];

// Success animations
const successEmojis = ['🎉', '✨', '🎊', '🌟', '💥', '🔥', '⭐', '🎆'];

// Get random loading message
const getRandomLoading = () => loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

// Get random success emoji
const getRandomSuccess = () => successEmojis[Math.floor(Math.random() * successEmojis.length)];

export default async function text(sock, msg, from) {
    const startTime = Date.now();
    
    try {
        // Load identity mappings
        const identityMappings = loadIdentityMappings();
        
        // 💬 MESSAGE PROCESSING
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          '';

        const isTextCommand = messageText.startsWith('!text') || messageText.startsWith('.text');
        
        if (!isTextCommand) {
            return await sock.sendMessage(from, {
                text: `
🎮 *SECURE MESSAGING CENTER* 🎮

❌ Invalid command syntax detected!

📝 *Correct Usage:*
   • !text [identity] your_message
   • Reply to any message + !text [identity]
   • .text [identity] your_message

🎯 *Examples:*
   • !text 1234 Hello there! 👋
   • !text admin Check this out! 🔥
   • (Reply to image) + !text 1234

🔑 *Available Identities:*
${Object.keys(identityMappings).map(key => `   • ${key}`).join('\n')}

💡 Pro tip: You can send ANY type of message!
                `.trim(),
            }, { quoted: msg });
        }

        // Parse command: .text [identity] [message]
        const commandText = messageText.replace(/^[.!]text/, '').trim();
        const commandParts = commandText.split(' ');
        const targetIdentity = commandParts[0];
        const messageBody = commandParts.slice(1).join(' ');
        
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // Check if identity is provided
        if (!targetIdentity) {
            return await sock.sendMessage(from, {
                text: `
🎯 *TARGET SELECTOR* 🎯

❌ No target identity specified!

📤 *How to use:*
   Format: !text [identity] [message]

🔑 *Available Identities:*
${Object.keys(identityMappings).map(key => `   • ${key}`).join('\n')}

🚀 *Examples:*
   • !text 1234 Hello there!
   • !text admin Important update
                `.trim(),
            }, { quoted: msg });
        }

        // Resolve identity to actual number
        const targetNumber = identityMappings[targetIdentity];
        
        if (!targetNumber) {
            return await sock.sendMessage(from, {
                text: `
🚫 *IDENTITY NOT FOUND* 🚫

❌ Identity "${targetIdentity}" not recognized!

🔑 *Available Identities:*
${Object.keys(identityMappings).map(key => `   • ${key}`).join('\n')}

💡 Tip: Check your identities.json file to add new contacts!
                `.trim(),
            }, { quoted: msg });
        }

        // Check if we have content to send
        if (!quotedMsg && !messageBody) {
            return await sock.sendMessage(from, {
                text: `
🎯 *MESSAGE COMPOSER* 🎯

❌ No message content detected!

📤 *Options:*
   1️⃣ Type: !text ${targetIdentity} your_message
   2️⃣ Reply to any message with: !text ${targetIdentity}

🚀 *Supported content:*
   • 📝 Text messages
   • 🖼️ Images with captions
   • 🎥 Videos
   • 🎵 Audio files
   • 📄 Documents
   • 🎭 Stickers

Ready to send to: ${targetIdentity} 📡
                `.trim(),
            }, { quoted: msg });
        }

        // 🚀 LAUNCH SEQUENCE INITIATED
        const launchMsg = await sock.sendMessage(from, {
            text: `
🚀 *SECURE TRANSMISSION INITIATED* 🚀

${getRandomLoading()}

🎯 Target: ${targetIdentity}
📱 Number: ${targetNumber.replace('@s.whatsapp.net', '')}
⚡ Status: ESTABLISHING CONNECTION...

Preparing secure transmission... 💫
            `.trim(),
        }, { quoted: msg });

        const footer = `\n\n🤖 *Delivered by Ernest v2 Secure Messenger*\n⚡ Sent: ${new Date().toLocaleString()}\n🔐 *Encrypted & Verified*`;

        try {
            // Update status
            await sock.sendMessage(from, {
                text: `
🚀 *TRANSMISSION IN PROGRESS* 🚀

${getRandomLoading()}

🎯 Target: ${targetIdentity}
📱 Number: ${targetNumber.replace('@s.whatsapp.net', '')}
⚡ Status: SENDING MESSAGE...

${getRandomSuccess()} Processing content...
                `.trim(),
                edit: launchMsg.key
            });

            if (quotedMsg) {
                const contentType = getContentType(quotedMsg);
                
                if (contentType === 'conversation' || contentType === 'extendedTextMessage') {
                    // 📝 Text message with style
                    const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
                    await sock.sendMessage(targetNumber, {
                        text: `📢 *SECURE MESSAGE* 📢\n\n${quotedText}${footer}`
                    });
                } 
                else if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(contentType)) {
                    // 📸 Media message handling
                    const mediaContent = quotedMsg[contentType];
                    const mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
                    
                    let mediaType = contentType.replace('Message', '');
                    if (mediaType === 'document') mediaType = 'document';
                    
                    const mediaCaption = mediaContent.caption ? 
                        `📢 *SECURE MEDIA* 📢\n\n${mediaContent.caption}${footer}` : 
                        `📢 *SECURE MEDIA* 📢${footer}`;

                    await sock.sendMessage(targetNumber, {
                        [mediaType]: mediaBuffer,
                        caption: mediaCaption,
                        mimetype: mediaContent.mimetype
                    });
                } 
                else if (contentType === 'stickerMessage') {
                    // 🎭 Sticker handling
                    const stickerBuffer = await sock.downloadMediaMessage(quotedMsg);
                    await sock.sendMessage(targetNumber, {
                        sticker: stickerBuffer
                    });
                    // Send follow-up text for stickers
                    await sock.sendMessage(targetNumber, {
                        text: `📢 *SECURE STICKER* 📢${footer}`
                    });
                }
                else {
                    // 🔄 Advanced forwarding
                    try {
                        const content = await generateForwardMessageContent(quotedMsg, false);
                        const newMsg = await generateWAMessageFromContent(targetNumber, content.message, {
                            userJid: from,
                            quoted: msg
                        });
                        await sock.relayMessage(targetNumber, newMsg.message, { messageId: newMsg.key.id });
                        
                        // Follow-up message
                        await sock.sendMessage(targetNumber, {
                            text: `📢 *SECURE FORWARD* 📢${footer}`
                        });
                    } catch (forwardError) {
                        console.error(`Failed to forward to ${targetNumber}:`, forwardError);
                        await sock.sendMessage(targetNumber, {
                            text: `📢 *SECURE MESSAGE* 📢\n\n[Original message format not supported]${footer}`
                        });
                    }
                }
            } else {
                // 💬 Direct text with epic formatting
                await sock.sendMessage(targetNumber, {
                    text: `
📢 *SECURE MESSAGE* 📢

${messageBody}${footer}
                    `.trim()
                });
            }

            // 🎉 MISSION COMPLETE
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);
            
            await sock.sendMessage(from, {
                text: `
🎊 *TRANSMISSION SUCCESSFUL* 🎊

╔══════════════════════════════════════╗
║         📊 DELIVERY CONFIRMED        ║
╠══════════════════════════════════════╣
║ 🎯 Target: ${targetIdentity.padEnd(23)} ║
║ 📱 Number: ${targetNumber.replace('@s.whatsapp.net', '').padEnd(22)} ║
║ ⏱️  Duration: ${duration.padStart(18)}s ║
║ ✅ Status: DELIVERED SUCCESSFULLY    ║
╚══════════════════════════════════════╝

${getRandomSuccess().repeat(3)} Message sent via Ernest v2! ${getRandomSuccess().repeat(3)}
                `.trim(),
                edit: launchMsg.key
            });

            console.log(`${getRandomSuccess()} Successfully sent to ${targetIdentity} (${targetNumber}) in ${duration}s`);
            
        } catch (err) {
            console.error(`❌ Failed to send to ${targetIdentity} (${targetNumber}):`, err);
            
            await sock.sendMessage(from, {
                text: `
❌ *TRANSMISSION FAILED* ❌

🚫 Failed to deliver message to ${targetIdentity}
📱 Target: ${targetNumber.replace('@s.whatsapp.net', '')}
⚠️ Error: ${err.message}

🔄 Please try again or check the target number!
                `.trim(),
                edit: launchMsg.key
            });
        }

    } catch (err) {
        console.error('💥 Critical error in messaging system:', err);
        await sock.sendMessage(from, {
            text: `
💥 *SYSTEM MALFUNCTION* 💥

⚠️ Secure messaging system encountered an error!
🔧 Error: ${err.message}

🚀 Ernest v2 is investigating...
Please try again in a moment! 🤖
            `.trim(),
        }, { quoted: msg });
    }
}

export const description = "🚀 Secure messaging system - send messages using identity keys stored in JSON file";
export const category = "messaging";

text.description = description;
text.category = category;