import { config } from 'dotenv';
config();

import {
    generateForwardMessageContent,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    getContentType
} from '@whiskeysockets/baileys';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function text(sock, msg, from) {
    try {
        const ownerNumber = (process.env.OWNER_NUMBER || '').trim();
        if (!ownerNumber) {
            return await sock.sendMessage(from, {
                text: '⚠️ OWNER_NUMBER is not set in .env file.',
            }, { quoted: msg });
        }

        const senderNumber = msg.key.remoteJid.split('@')[0];
        if (senderNumber !== ownerNumber) {
            return await sock.sendMessage(from, {
                text: '⛔ Access denied. Only the bot owner can use this command.',
            }, { quoted: msg });
        }

        const specialNumbers = (process.env.SPECIAL_NUMBERS || '')
            .split(',')
            .map(n => n.trim())
            .filter(n => n)
            .map(n => n.includes('@') ? n : `${n}@s.whatsapp.net`);

        if (!specialNumbers.length) {
            return await sock.sendMessage(from, {
                text: '⚠️ No special numbers found in .env (SPECIAL_NUMBERS).',
            }, { quoted: msg });
        }

        // Safely get message text
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          '';

        // Check if message starts with !text or .text
        const isTextCommand = messageText.startsWith('!text') || messageText.startsWith('.text');
        
        if (!isTextCommand) {
            return await sock.sendMessage(from, {
                text: '❌ Invalid command format. Use "!text your_message" or reply to a message with "!text"',
            }, { quoted: msg });
        }

        const textBody = messageText.replace(/^[.!]text/, '').trim();
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMsg && !textBody) {
            return await sock.sendMessage(from, {
                text: '❌ No message content or reply detected.\n\nUsage:\n!text your_message\nOR\nReply to a message with !text',
            }, { quoted: msg });
        }

        const footer = '\n\n> This message was sent automatically by Ernest v2 bot 🤖';

        for (const number of specialNumbers) {
            try {
                if (quotedMsg) {
                    // Get the content type of the quoted message
                    const contentType = getContentType(quotedMsg);
                    
                    if (contentType === 'conversation' || contentType === 'extendedTextMessage') {
                        // Text message
                        const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
                        await sock.sendMessage(number, {
                            text: `${quotedText}${footer}`
                        });
                    } 
                    else if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(contentType)) {
                        // Media message - handle properly
                        const mediaContent = quotedMsg[contentType];
                        
                        // Download the media first
                        const mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
                        
                        let mediaType = contentType.replace('Message', '');
                        if (mediaType === 'document') mediaType = 'document'; // Keep as document
                        
                        await sock.sendMessage(number, {
                            [mediaType]: {
                                url: '', // Not needed when using buffer
                                mimetype: mediaContent.mimetype,
                                caption: mediaContent.caption ? `${mediaContent.caption}${footer}` : footer,
                                file: mediaBuffer
                            }
                        });
                    } else {
                        // Try forwarding as last resort
                        try {
                            const content = await generateForwardMessageContent(quotedMsg, false);
                            const newMsg = await generateWAMessageFromContent(number, content.message, {
                                userJid: from,
                                quoted: msg
                            });
                            await sock.relayMessage(number, newMsg.message, { messageId: newMsg.key.id });
                        } catch (forwardError) {
                            console.error(`Failed to forward to ${number}:`, forwardError);
                            await sock.sendMessage(number, {
                                text: `[Original message could not be forwarded]${footer}`
                            });
                        }
                    }
                } else {
                    // Direct text message
                    await sock.sendMessage(number, {
                        text: `${textBody}${footer}`
                    });
                }

                console.log(`✅ Sent to ${number}`);
                await sleep(10000); // cooldown: 10s
            } catch (err) {
                console.error(`❌ Failed to send to ${number}:`, err);
            }
        }

        await sock.sendMessage(from, {
            text: `📣 Broadcast complete. Sent to ${specialNumbers.length} number(s).`,
        }, { quoted: msg });

    } catch (err) {
        console.error('❌ Error in text command:', err);
        await sock.sendMessage(from, {
            text: '⚠️ Broadcast failed. Please try again later.',
        }, { quoted: msg });
    }
}

export const description = "Sends text/media to preset numbers (owner-only)";
export const category = "broadcast";

text.description = description;
text.category = category;