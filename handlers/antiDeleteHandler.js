// handlers/antiDeleteHandler.js
// This module handles the anti-delete functionality for WhatsApp messages.

import { getContentType } from '@whiskeysockets/baileys';
import logger from '../utilis/logger.js'; // Path adjusted: Up one level from handlers, then down into utils
import messageStorage from '../data/messageStorage.js'; // Path adjusted: Up one level from handlers, then down into data

// --- Your Bot Owner JID (Configure this appropriately) ---
const botOwner = process.env.BOT_OWNER_JID;
if (!botOwner) {
    logger.error('BOT_OWNER_JID environment variable is not set. Anti-delete notifications will not be sent.');
}

/**
 * Handles incoming messages to store text messages for anti-delete and detect revocations.
 * @param {object} sock - The Baileys socket connection.
 * @param {object} msg - The incoming message object from Baileys.
 * @returns {boolean} False if the message was handled by anti-delete (e.g., a deletion), true otherwise (to continue with other handlers).
 */
export async function handleAntiDelete(sock, msg) {
    const messageId = msg.key.id;
    const chatId = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const messageType = getContentType(msg.message || {});

    // Ignore messages sent by the bot itself
    if (msg.key.fromMe) {
        return true; // Allow other handlers to process if needed
    }

    try {
        if (!messageStorage.isInitialized) {
            logger.debug('Initializing message storage for anti-delete.');
            await messageStorage.initialize();
        }

        // --- Handle Protocol Messages (e.g., Message Deletions) ---
        if (msg.message?.protocolMessage) {
            logger.debug({
                messageId,
                protocolType: msg.message.protocolMessage?.type
            }, 'Processing protocol message for anti-delete.');

            if (msg.message.protocolMessage?.type === 'REVOKE') {
                await handleMessageDeletion(sock, msg);
            }
            return false; // This message was a protocol message, Anti-Delete handled it.
        }

        // --- Store only Text-Based Messages ---
        if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (text && text.trim().length > 0) {
                const storedMsgData = {
                    chatId: chatId,
                    sender: senderJid,
                    type: messageType,
                    text: text,
                    timestamp: new Date().toISOString(),
                    quotedMessage: msg.message.extendedTextMessage?.contextInfo?.quotedMessage,
                };
                await messageStorage.storeMessage(messageId, storedMsgData);
                logger.info({
                    messageId,
                    chatId,
                    type: messageType,
                    sender: senderJid
                }, 'Text message stored for anti-delete.');
            } else {
                 logger.debug(`Empty or whitespace-only text message for ID: ${messageId}. Skipping storage.`);
            }
        } else {
            logger.info({
                messageId,
                chatId,
                type: messageType,
                sender: senderJid
            }, 'Non-text message received. Skipping storage for anti-delete.');
        }

        return true; // Allow other handlers to process this regular message
    } catch (error) {
        logger.error({
            error: error.message,
            stack: error.stack,
            messageId,
            chatId,
            messageType
        }, 'Anti-delete handler error');
        return true; // Don't block other handlers if anti-delete fails
    }
}

/**
 * Handles the detection of a deleted message and sends a notification.
 * @param {object} sock - The Baileys socket connection.
 * @param {object} msg - The incoming protocol message object (REVOKE type).
 */
async function handleMessageDeletion(sock, msg) {
    const deletedMessageId = msg.message.protocolMessage?.key?.id;
    const deletedFromJid = msg.key.remoteJid;
    const ownerJid = botOwner ? `${botOwner}@s.whatsapp.net` : null;

    if (!deletedMessageId) {
        logger.warn('Could not extract deleted message ID from protocolMessage.');
        return;
    }
    if (!ownerJid) {
        logger.warn('Bot owner JID not configured. Skipping anti-delete notification for message ID:', deletedMessageId);
        return;
    }

    try {
        const originalMessage = messageStorage.getMessage(deletedMessageId);

        if (originalMessage) {
            logger.debug(`Found deleted message for ID: ${deletedMessageId}`);

            const deleteNotification = {
                text: `🗑️ *ANTI-DELETE ALERT (Text Message)*\n\n` +
                      `📱 *Chat:* ${originalMessage.chatId || deletedFromJid}\n` +
                      `🕒 *Deleted At:* ${new Date().toLocaleString()}\n` +
                      `🆔 *Message ID:* ${deletedMessageId}\n` +
                      `👤 *Sender:* ${originalMessage.sender || 'Unknown'}\n` +
                      `💬 *Type:* ${originalMessage.type || 'Unknown'}\n\n` +
                      `📝 *Original Message:* \n\`\`\`\n${originalMessage.text || 'N/A'}\n\`\`\``
            };

            await sock.sendMessage(ownerJid, deleteNotification);
            logger.info(`Anti-delete notification sent to owner for message ID: ${deletedMessageId}`);

            // Optional: Remove the message from storage after notifying
            // messageStorage._messages.delete(deletedMessageId);
            // await messageStorage.saveToFile();
        } else {
            logger.info(`Deleted message ID ${deletedMessageId} not found in storage (was likely a non-text message or too old/pruned).`);
        }
    } catch (error) {
        logger.error({
            error: error.message,
            stack: error.stack,
            deletedMessageId,
            chatId: deletedFromJid
        }, 'Failed to handle message deletion');
    }
}