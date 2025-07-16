// commands/addspecial.js
import pkg from '@whiskeysockets/baileys';
const {  jidNormalizedUser } = pkg;
import logger from '../utilis/logger.js'; // Adjust path if necessary

async function addspecial(sock, msg, from, args, specialContactsStorage) { // Added specialContactsStorage parameter
    if (!specialContactsStorage) {
        logger.error('specialContactsStorage not provided to addspecial command.');
        await sock.sendMessage(from, { text: '🚫 Error: Special contacts management system not initialized.' });
        return;
    }

    // Only allow owner/admin to use these commands for security
    // You'll need to implement your own check here if you haven't already.
    // Example: if (from !== process.env.BOT_OWNER_JID_FULL) { /* deny */ }
    // For now, assuming you'll add authorization outside or within each command.
    // Example authorization check (place at the top of each command function)
    const ownerJid = process.env.BOT_OWNER_JID_FULL; // Make sure this env var holds your FULL JID, e.g., '254712345678@s.whatsapp.net'
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for command ${command.name} by ${from}`);
        return;
    }
    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: `!addspecial <phoneNumber>` (e.g., `!addspecial 254712345678`)' });
        return;
    }

    const phoneNumber = args[0].replace(/[^0-9]/g, ''); // Remove non-digits
    if (!phoneNumber) {
        await sock.sendMessage(from, { text: '🚫 Invalid phone number provided.' });
        return;
    }

    // Normalize JID to ensure consistency (e.g., '254712345678@s.whatsapp.net')
    const jidToAdd = jidNormalizedUser(`${phoneNumber}@s.whatsapp.net`);

    if (specialContactsStorage.addContact(jidToAdd)) {
        await sock.sendMessage(from, { text: `✅ Number *${phoneNumber}* added to special contacts.` });
        logger.info(`Added special contact: ${phoneNumber}`);
    } else {
        await sock.sendMessage(from, { text: `⚠️ Number *${phoneNumber}* is already in special contacts.` });
        logger.warn(`Attempted to add existing special contact: ${phoneNumber}`);
    }
}

addspecial.description = 'Adds a phone number to the special contact alert list.';
addspecial.emoji = '➕';
addspecial.category = 'Special Alerts';

export default addspecial;