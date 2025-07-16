// commands/removespecial.js
import pkg from '@whiskeysockets/baileys';
const {  jidNormalizedUser} = pkg;
import logger from '../utilis/logger.js'; // Adjust path if necessary

async function removespecial(sock, msg, from, args, specialContactsStorage) { // Added specialContactsStorage parameter
    if (!specialContactsStorage) {
        logger.error('specialContactsStorage not provided to removespecial command.');
        await sock.sendMessage(from, { text: '🚫 Error: Special contacts management system not initialized.' });
        return;
    }
    // Example authorization check (place at the top of each command function)
    const ownerJid = process.env.BOT_OWNER_JID_FULL; // Make sure this env var holds your FULL JID, e.g., '254712345678@s.whatsapp.net'
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for command ${command.name} by ${from}`);
        return;
    }
    // Only allow owner/admin to use these commands for security
    // You'll need to implement your own check here if you haven't already.

    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: `!removespecial <phoneNumber>` (e.g., `!removespecial 254712345678`)' });
        return;
    }

    const phoneNumber = args[0].replace(/[^0-9]/g, ''); // Remove non-digits
    if (!phoneNumber) {
        await sock.sendMessage(from, { text: '🚫 Invalid phone number provided.' });
        return;
    }

    // Normalize JID to ensure consistency
    const jidToRemove = jidNormalizedUser(`${phoneNumber}@s.whatsapp.net`);

    if (specialContactsStorage.removeContact(jidToRemove)) {
        await sock.sendMessage(from, { text: `🗑️ Number *${phoneNumber}* removed from special contacts.` });
        logger.info(`Removed special contact: ${phoneNumber}`);
    } else {
        await sock.sendMessage(from, { text: `❌ Number *${phoneNumber}* was not found in special contacts.` });
        logger.warn(`Attempted to remove non-existent special contact: ${phoneNumber}`);
    }
}

removespecial.description = 'Removes a phone number from the special contact alert list.';
removespecial.emoji = '➖';
removespecial.category = 'Special Alerts';

export default removespecial;