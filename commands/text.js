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

// Animated loading messages
const loadingMessages = [
    '🚀 Initializing broadcast system...',
    '📡 Connecting to satellite networks...',
    '🌍 Reaching contacts across the globe...',
    '⚡ Powering up transmission array...',
    '🎯 Locking onto target recipients...',
    '💫 Preparing for mass deployment...'
];

// Success animations
const successEmojis = ['🎉', '✨', '🎊', '🌟', '💥', '🔥', '⭐', '🎆'];

// Get random loading message
const getRandomLoading = () => loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

// Get random success emoji
const getRandomSuccess = () => successEmojis[Math.floor(Math.random() * successEmojis.length)];

// Create awesome progress bar
const createProgressBar = (current, total, width = 20) => {
    const percentage = Math.round((current / total) * 100);
    const filledWidth = Math.round((current / total) * width);
    const emptyWidth = width - filledWidth;
    
    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);
    
    return `[${filled}${empty}] ${percentage}%`;
};

// Generate broadcast stats
const generateStats = (sent, failed, total, startTime) => {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    const successRate = ((sent / total) * 100).toFixed(1);
    
    return `
╔══════════════════════════════════════╗
║           📊 BROADCAST STATS         ║
╠══════════════════════════════════════╣
║ 📤 Messages Sent: ${sent.toString().padStart(15)} ║
║ ❌ Failed Sends:  ${failed.toString().padStart(15)} ║
║ 📊 Success Rate:  ${successRate.padStart(13)}% ║
║ ⏱️  Duration:     ${duration.padStart(12)}s ║
║ 🎯 Total Targets: ${total.toString().padStart(15)} ║
╚══════════════════════════════════════╝
    `.trim();
};

export default async function text(sock, msg, from) {
    const startTime = Date.now();
    
    try {
        // 🔐 SECURITY CHECK
        const ownerNumber = (process.env.OWNER_NUMBER || '').trim();
        if (!ownerNumber) {
            return await sock.sendMessage(from, {
                text: `
🚨 *SYSTEM ERROR* 🚨

⚠️ Owner verification failed!
🔧 OWNER_NUMBER not configured in .env

Contact system administrator immediately! 🔧
                `.trim(),
            }, { quoted: msg });
        }

        const senderNumber = msg.key.remoteJid.split('@')[0];
        if (senderNumber !== ownerNumber) {
            return await sock.sendMessage(from, {
                text: `
🚫 *ACCESS DENIED* 🚫

⛔ Unauthorized broadcast attempt detected!
👤 Only the supreme commander can use this weapon!

🔐 Nice try, but this is owner-only territory! 😎
                `.trim(),
            }, { quoted: msg });
        }

        // 📡 TARGET ACQUISITION
        const specialNumbers = (process.env.SPECIAL_NUMBERS || '')
            .split(',')
            .map(n => n.trim())
            .filter(n => n)
            .map(n => n.includes('@') ? n : `${n}@s.whatsapp.net`);

        if (!specialNumbers.length) {
            return await sock.sendMessage(from, {
                text: `
🎯 *TARGET ACQUISITION FAILED* 🎯

⚠️ No special numbers detected in database!
📝 Please configure SPECIAL_NUMBERS in .env

Format: SPECIAL_NUMBERS=1234567890,0987654321
                `.trim(),
            }, { quoted: msg });
        }

        // 💬 MESSAGE PROCESSING
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          '';

        const isTextCommand = messageText.startsWith('!text') || messageText.startsWith('.text');
        
        if (!isTextCommand) {
            return await sock.sendMessage(from, {
                text: `
🎮 *COMMAND CENTER* 🎮

❌ Invalid command syntax detected!

📝 *Correct Usage:*
   • !text your_message
   • Reply to any message + !text
   • .text your_message

🎯 *Examples:*
   • !text Hello everyone! 👋
   • (Reply to image) + !text
   • .text Check this out! 🔥

💡 Pro tip: You can broadcast ANY type of message!
                `.trim(),
            }, { quoted: msg });
        }

        const textBody = messageText.replace(/^[.!]text/, '').trim();
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMsg && !textBody) {
            return await sock.sendMessage(from, {
                text: `
🎯 *BROADCAST LAUNCHER* 🎯

❌ No payload detected!

📤 *How to use:*
   1️⃣ Type: !text your_message
   2️⃣ OR reply to any message with !text

🚀 *Supported content:*
   • 📝 Text messages
   • 🖼️ Images with captions
   • 🎥 Videos
   • 🎵 Audio files
   • 📄 Documents
   • 🎭 Stickers

Ready to broadcast to ${specialNumbers.length} contacts! 📡
                `.trim(),
            }, { quoted: msg });
        }

        // 🚀 LAUNCH SEQUENCE INITIATED
        const launchMsg = await sock.sendMessage(from, {
            text: `
🚀 *BROADCAST SYSTEM ACTIVATED* 🚀

${getRandomLoading()}

📊 Targets: ${specialNumbers.length}
⚡ Status: INITIALIZING...
${createProgressBar(0, specialNumbers.length)}

Stand by for transmission... 💫
            `.trim(),
        }, { quoted: msg });

        const footer = `\n\n🤖 *Delivered by Ernest v2 Broadcast System*\n⚡ Sent: ${new Date().toLocaleString()}\n🚀 *Powered by advanced AI technology*`;

        let sentCount = 0;
        let failedCount = 0;

        // 📡 TRANSMISSION LOOP
        for (let i = 0; i < specialNumbers.length; i++) {
            const number = specialNumbers[i];
            const progress = i + 1;
            
            try {
                // Update progress every few sends
                if (i % 2 === 0 || i === specialNumbers.length - 1) {
                    await sock.sendMessage(from, {
                        text: `
🚀 *BROADCASTING IN PROGRESS* 🚀

${getRandomLoading()}

📊 Progress: ${progress}/${specialNumbers.length}
⚡ Status: TRANSMITTING...
${createProgressBar(progress, specialNumbers.length)}

${getRandomSuccess()} Sending to contact ${progress}...
                        `.trim(),
                        edit: launchMsg.key
                    });
                }

                if (quotedMsg) {
                    const contentType = getContentType(quotedMsg);
                    
                    if (contentType === 'conversation' || contentType === 'extendedTextMessage') {
                        // 📝 Text message with style
                        const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
                        await sock.sendMessage(number, {
                            text: `📢 *BROADCAST MESSAGE* 📢\n\n${quotedText}${footer}`
                        });
                    } 
                    else if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(contentType)) {
                        // 📸 Media message handling
                        const mediaContent = quotedMsg[contentType];
                        const mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
                        
                        let mediaType = contentType.replace('Message', '');
                        if (mediaType === 'document') mediaType = 'document';
                        
                        const mediaCaption = mediaContent.caption ? 
                            `📢 *BROADCAST MEDIA* 📢\n\n${mediaContent.caption}${footer}` : 
                            `📢 *BROADCAST MEDIA* 📢${footer}`;

                        await sock.sendMessage(number, {
                            [mediaType]: mediaBuffer,
                            caption: mediaCaption,
                            mimetype: mediaContent.mimetype
                        });
                    } 
                    else if (contentType === 'stickerMessage') {
                        // 🎭 Sticker handling
                        const stickerBuffer = await sock.downloadMediaMessage(quotedMsg);
                        await sock.sendMessage(number, {
                            sticker: stickerBuffer
                        });
                        // Send follow-up text for stickers
                        await sock.sendMessage(number, {
                            text: `📢 *BROADCAST STICKER* 📢${footer}`
                        });
                    }
                    else {
                        // 🔄 Advanced forwarding
                        try {
                            const content = await generateForwardMessageContent(quotedMsg, false);
                            const newMsg = await generateWAMessageFromContent(number, content.message, {
                                userJid: from,
                                quoted: msg
                            });
                            await sock.relayMessage(number, newMsg.message, { messageId: newMsg.key.id });
                            
                            // Follow-up message
                            await sock.sendMessage(number, {
                                text: `📢 *BROADCAST FORWARD* 📢${footer}`
                            });
                        } catch (forwardError) {
                            console.error(`Failed to forward to ${number}:`, forwardError);
                            await sock.sendMessage(number, {
                                text: `📢 *BROADCAST MESSAGE* 📢\n\n[Original message format not supported]${footer}`
                            });
                        }
                    }
                } else {
                    // 💬 Direct text with epic formatting
                    await sock.sendMessage(number, {
                        text: `
📢 *BROADCAST MESSAGE* 📢

${textBody}${footer}
                        `.trim()
                    });
                }

                sentCount++;
                console.log(`${getRandomSuccess()} Successfully sent to ${number} (${progress}/${specialNumbers.length})`);
                
                // Staggered delay for better delivery
                const delay = specialNumbers.length > 10 ? 8000 : 5000;
                await sleep(delay);
                
            } catch (err) {
                failedCount++;
                console.error(`❌ Failed to send to ${number}:`, err);
                
                // Continue with next contact
                continue;
            }
        }

        // 🎉 MISSION COMPLETE
        const finalStats = generateStats(sentCount, failedCount, specialNumbers.length, startTime);
        
        await sock.sendMessage(from, {
            text: `
🎊 *BROADCAST MISSION COMPLETE* 🎊

${finalStats}

${sentCount === specialNumbers.length ? 
    `🎯 *PERFECT SCORE!* All messages delivered! 🎯` : 
    `⚡ *MISSION ACCOMPLISHED!* ${sentCount}/${specialNumbers.length} delivered`}

${getRandomSuccess().repeat(3)} Thanks for using Ernest v2 Broadcast! ${getRandomSuccess().repeat(3)}
            `.trim(),
            edit: launchMsg.key
        });

        // 📊 Log final results
        console.log(`
🚀 BROADCAST COMPLETE 🚀
✅ Sent: ${sentCount}
❌ Failed: ${failedCount}  
📊 Total: ${specialNumbers.length}
⏱️ Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s
        `);

    } catch (err) {
        console.error('💥 Critical error in broadcast system:', err);
        await sock.sendMessage(from, {
            text: `
💥 *SYSTEM MALFUNCTION* 💥

⚠️ Broadcast system encountered an error!
🔧 Error: ${err.message}

🚀 Ernest v2 is investigating...
Please try again in a moment! 🤖
            `.trim(),
        }, { quoted: msg });
    }
}

export const description = "🚀 Epic broadcast system - sends messages to preset numbers with style! (owner-only)";
export const category = "broadcast";

text.description = description;
text.category = category;