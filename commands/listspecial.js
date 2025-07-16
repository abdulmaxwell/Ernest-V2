// commands/listspecial.js
import logger from '../utilis/logger.js'; // Adjust path if necessary

async function listspecial(sock, msg, from, args, specialContactsStorage) { // Added specialContactsStorage parameter
    if (!specialContactsStorage) {
        logger.error('specialContactsStorage not provided to listspecial command.');
        await sock.sendMessage(from, { text: '🚫 Error: Special contacts management system not initialized.' });
        return;
    }

    // Only allow owner/admin to use these commands for security
    // You'll need to implement your own check here if you haven't already.
    // Example authorization check (place at the top of each command function)
    const ownerJid = process.env.BOT_OWNER_JID_FULL; // Make sure this env var holds your FULL JID, e.g., '254712345678@s.whatsapp.net'
    if (from !== ownerJid) {
        await sock.sendMessage(from, { text: '🚫 You are not authorized to use this command.' });
        logger.warn(`Unauthorized access attempt for command ${command.name} by ${from}`);
        return;
    }
    const specialContacts = specialContactsStorage.getAllContacts();

    if (specialContacts.length === 0) {
        await sock.sendMessage(from, { text: 'ℹ️ No special contacts configured yet. Use `!addspecial` to add one.' });
        logger.info('Listed special contacts: (empty)');
        return;
    }

    let response = '🌟 *Current Special Contacts:* 🌟\n\n';
    specialContacts.forEach((jid, index) => {
        // Extract just the number part for display
        const phoneNumber = jid.split('@')[0];
        response += `${index + 1}. \`\`\`${phoneNumber}\`\`\`\n`;
    });
    response += '\n_Numbers are displayed without country code prefix if not explicitly added._'; // Clarification

    await sock.sendMessage(from, { text: response });
    logger.info(`Listed ${specialContacts.length} special contacts.`);
}

listspecial.description = 'Lists all phone numbers currently in the special contact alert list.';
listspecial.emoji = '📋';
listspecial.category = 'Special Alerts';

export default listspecial;