// commands/me.js

const me = async (sock, msg, from) => {
    try {
        const botJid = sock.user.id;
        const botName = sock.user.name; // This might be undefined if not set in credentials
        const botNumber = botJid.split(':')[0].split('@')[0]; // Extract number if present

        let botInfo = `*🤖 ErnestV2 Bot Info:*\n\n`;
        botInfo += `🆔 *JID:* ${botJid}\n`;
        botInfo += `📞 *Number:* ${botNumber}\n`;
        botInfo += `📝 *Name:* ${botName || 'Not Set'}\n`; // Display bot name if available
        botInfo += `✨ *Status:* Online and ready!\n`;
        botInfo += `🚀 *Prefix:* ${process.env.PREFIX || '!'}\n`; // Assuming PREFIX from .env

        // Optionally fetch and send bot's own profile picture
        try {
            const pfpUrl = await sock.profilePictureUrl(botJid, 'image');
            if (pfpUrl) {
                await sock.sendMessage(from, { image: { url: pfpUrl }, caption: botInfo }, { quoted: msg });
                return; // Exit after sending image with caption
            }
        } catch (pfpError) {
            console.warn("Could not fetch bot's own profile picture:", pfpError.message);
            // Fallback to sending text if PFP fails
        }

        await sock.sendMessage(from, { text: botInfo }, { quoted: msg });

    } catch (err) {
        console.error("❌ Error in me command:", err);
        console.error("❌ Error stack:", err.stack);
        await sock.sendMessage(from, { text: `🚫 An error occurred while fetching bot info: ${err.message}` }, { quoted: msg });
    }
};

me.description = "Displays information about ErnestV2 bot.";
me.category = "Bot";
me.usage = "/me";
me.emoji = "🤖";

export default me;