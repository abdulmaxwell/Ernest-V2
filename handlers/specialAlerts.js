// handlers/specialAlerts.js
// REMOVE: import { jidDecode } from '@whiskeysockets/baileys'; // Only need jidDecode here (will be defined locally)

/**
 * Handles special contact alerts if the incoming message is from a designated special contact.
 * @param {import('@whiskeysockets/baileys').WASocket} sock - The Baileys socket instance.
 * @param {import('@whiskeysockets/baileys').WAMessage} msg - The incoming message object.
 * @param {string} from - The JID of the sender.
 * @param {string[]} specialContactJids - Array of JIDs designated as special contacts. (Passed from storage)
 * @param {string} botJid - The JID of the bot itself (for sending alerts to).
 */
export const handleSpecialAlert = async (sock, msg, from, specialContactJids, botJid) => {
    // Only proceed if special alerts are enabled and the sender is a special contact, and not the bot itself
    // specialContactJids now comes directly from the storage's getAllContacts(),
    // so we just check if the 'from' JID is in that array.
    if (!specialContactJids.includes(jidNormalizedUser(from)) || msg.key.fromMe) {
        return;
    }

    try {
        let senderName = from.split('@')[0]; // Default to number if name not found
        const normalizedFrom = jidNormalizedUser(from);

        // --- REVISED NAME RESOLUTION START ---
        if (sock.contacts && sock.contacts[normalizedFrom]) {
            const contact = sock.contacts[normalizedFrom];
            senderName = contact.notify || contact.vname || contact.name || senderName;
            console.log(`DEBUG: Found cached contact name for ${normalizedFrom}: ${senderName}`);
        } else {
            console.log(`DEBUG: Contact ${normalizedFrom} not found in cache. Using number as sender name.`);
        }
        // --- REVISED NAME RESOLUTION END ---

        let messageSnippet = "*(No text preview)*";
        let fullMessageText = "";

        // Extract message content based on type (using getContentType for robustness)
        const messageType = getContentType(msg.message || {});
        if (messageType === 'conversation') {
            fullMessageText = msg.message.conversation;
            messageSnippet = fullMessageText.substring(0, 50) + (fullMessageText.length > 50 ? "..." : "");
        } else if (messageType === 'extendedTextMessage') {
            fullMessageText = msg.message.extendedTextMessage.text;
            messageSnippet = fullMessageText.substring(0, 50) + (fullMessageText.length > 50 ? "..." : "");
        } else if (messageType === 'imageMessage') {
            messageSnippet = `*(Image: ${msg.message.imageMessage?.caption ? msg.message.imageMessage.caption.substring(0, 20) + '...' : ''})*`;
        } else if (messageType === 'videoMessage') {
            messageSnippet = `*(Video: ${msg.message.videoMessage?.caption ? msg.message.videoMessage.caption.substring(0, 20) + '...' : ''})*`;
        } else if (messageType === 'audioMessage') {
            messageSnippet = "*(Audio)*";
        } else if (messageType === 'documentMessage') {
            messageSnippet = `*(Document: ${msg.message.documentMessage.fileName || 'unknown'})*`;
        } else if (messageType === 'stickerMessage') {
            messageSnippet = "*(Sticker)*";
        } else if (messageType === 'contactsArrayMessage') {
            messageSnippet = `*(Contact card: ${msg.message.contactsArrayMessage.contacts?.length || 0} contacts)*`;
        } else if (messageType === 'locationMessage') {
            messageSnippet = "*(Location)*";
        } else if (messageType === 'reactionMessage') {
            messageSnippet = `*(Reaction: ${msg.message.reactionMessage.text || ''})*`;
        } else if (messageType === 'protocolMessage') {
            // Should usually be caught by antiDeleteHandler, but for completeness
            messageSnippet = "*(Protocol Message)*";
        } else {
            messageSnippet = `*(Unsupported Message Type: ${messageType})*`;
        }


        // Construct the direct link to the chat itself
        const chatLink = `https://wa.me/${from.split('@')[0]}`;

        const alertMessage = `🚨 *Special Person Alert!* 🚨\n\n` +
                             `I just auto-read a message from *${senderName}*.\n\n` +
                             `*Preview:* "${messageSnippet}"\n` +
                             `\nGo check it out: ${chatLink}\n` +
                             `\n*(Original message ID: ${msg.key.id})*`;

        await sock.sendMessage(botJid, { text: alertMessage });
        console.log(`DEBUG: Sent enhanced special contact alert to ${botJid} for message from ${from}.`);

    } catch (err) {
        console.error("❌ Error in handleSpecialAlert (main block):", err);
        console.error("❌ Error stack:", err.stack);
        await sock.sendMessage(botJid, { text: `🚫 An error occurred while generating a special alert for ${from.split('@')[0]}. Please check logs.` });
    }
};

// Helper function: JID normalization (moved here for self-containment)
// This is effectively the same as Baileys' jidNormalizedUser but avoids extra import
function jidNormalizedUser(jid) {
    if (!jid) return undefined;
    // Simple parsing for number@s.whatsapp.net or similar formats
    const parts = jid.split('@');
    if (parts.length === 2 && parts[0] && parts[1]) {
        // We only care about user@server for normalization
        return `${parts[0].replace(/[^0-9]/g, '')}@${parts[1]}`;
    }
    return undefined; // Or throw an error for invalid JID
}

// You might also need a jidDecode function here if your logic needs to extract user/server separately.
// For now, jidNormalizedUser is sufficient as it processes raw JIDs.
// If you want full jidDecode, you'll need to re-import it from baileys here.
// For this specific use case, simple split and regex is fine if JID format is consistent.