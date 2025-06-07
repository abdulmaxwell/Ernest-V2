// handlers/specialAlerts.js
import { jidDecode } from '@whiskeysockets/baileys'; // Only need jidDecode here

/**
 * Handles special contact alerts if the incoming message is from a designated special contact.
 * @param {import('@whiskeysockets/baileys').WASocket} sock - The Baileys socket instance.
 * @param {import('@whiskeysockets/baileys').WAMessage} msg - The incoming message object.
 * @param {string} from - The JID of the sender.
 * @param {string[]} specialContactJids - Array of JIDs designated as special contacts.
 * @param {string} botJid - The JID of the bot itself (for sending alerts to).
 */
export const handleSpecialAlert = async (sock, msg, from, specialContactJids, botJid) => {
    // Only proceed if special alerts are enabled and the sender is a special contact, and not the bot itself
    if (!specialContactJids.includes(jidNormalizedUser(from)) || msg.key.fromMe) {
        return;
    }

    try {
        let senderName = from.split('@')[0]; // Default to number if name not found
        const normalizedFrom = jidNormalizedUser(from);

        // --- REVISED NAME RESOLUTION START ---
        // Attempt to get the contact name from the cached sock.contacts object.
        // This is the most reliable way to get names for contacts the bot already knows.
        if (sock.contacts && sock.contacts[normalizedFrom]) {
            const contact = sock.contacts[normalizedFrom];
            // Prioritize cached display name (notify/vname) then regular name.
            senderName = contact.notify || contact.vname || contact.name || senderName;
            console.log(`DEBUG: Found cached contact name for ${normalizedFrom}: ${senderName}`);
        } else {
            console.log(`DEBUG: Contact ${normalizedFrom} not found in cache. Using number as sender name.`);
            // If not in cache, senderName remains the default number.
            // We avoid complex queries here to prevent errors and rate limits.
        }
        // --- REVISED NAME RESOLUTION END ---

        let messageSnippet = "*(No text preview)*";
        let fullMessageText = "";

        // Extract message content based on type
        if (msg.message) {
            if (msg.message.conversation) {
                fullMessageText = msg.message.conversation;
                messageSnippet = fullMessageText.substring(0, 50) + (fullMessageText.length > 50 ? "..." : "");
            } else if (msg.message.extendedTextMessage?.text) {
                fullMessageText = msg.message.extendedTextMessage.text;
                messageSnippet = fullMessageText.substring(0, 50) + (fullMessageText.length > 50 ? "..." : "");
            } else if (msg.message.imageMessage) {
                messageSnippet = "*(Image)*";
            } else if (msg.message.videoMessage) {
                messageSnippet = "*(Video)*";
            } else if (msg.message.audioMessage) {
                messageSnippet = "*(Audio)*";
            } else if (msg.message.documentMessage) {
                messageSnippet = `*(Document: ${msg.message.documentMessage.fileName || 'unknown'})*`;
            } else if (msg.message.stickerMessage) {
                messageSnippet = "*(Sticker)*";
            } else if (msg.message.contactsArrayMessage) {
                messageSnippet = `*(Contact card: ${msg.message.contactsArrayMessage.contacts?.length || 0} contacts)*`;
            } else if (msg.message.locationMessage) {
                messageSnippet = "*(Location)*";
            }
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

// This jidNormalizedUser helper function is included for self-containment
function jidNormalizedUser(jid) {
    if (!jid) return undefined;
    const { user, server } = jidDecode(jid) || {};
    if (user && server) return `${user}@${server}`;
    return undefined;
}