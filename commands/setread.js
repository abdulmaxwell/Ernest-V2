// commands/setread.js
import dotenv from 'dotenv'; // Import dotenv to access process.env

dotenv.config(); // Load .env vars

const setReadCommand = async (sock, msg, from) => {
    try {
        const autoReadStatus = process.env.AUTO_READ_MESSAGES === 'true' ? 'enabled' : 'disabled';
        const responseText = `⚙️ Auto-reading of incoming messages is currently *${autoReadStatus}*.\n\n` +
                             `To change this, please edit the \`AUTO_READ_MESSAGES\` variable in your bot's \`.env\` file ` +
                             `(set to \`true\` to enable, \`false\` to disable) and restart the bot.`;

        await sock.sendMessage(from, { text: responseText }, { quoted: msg });

    } catch (err) {
        console.error("❌ Error in setread command:", err);
        console.error("❌ Error stack:", err.stack);
        await sock.sendMessage(from, { text: `🚫 An error occurred while checking auto-read status: ${err.message}` }, { quoted: msg });
    }
};

setReadCommand.description = "Checks and informs about the bot's auto-read status.";
setReadCommand.category = "Bot Settings";
setReadCommand.usage = "/setread";
setReadCommand.emoji = "⚙️";

export default setReadCommand;