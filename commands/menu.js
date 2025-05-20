import { commandMap } from '../handlers/messageHandler.js'; // or wherever your commandMap is
import { ownerNumber } from '../config.js';

export default async function menu(sock, msg, from) {
    try {
        const prefix = process.env.PREFIX || '.';
        const imageUrl = process.env.BOT_IMAGE || 'https://avatars.githubusercontent.com/u/173539960?s=400&v=4';
        // Group commands by category
        const categorized = {};
        for (const [cmd, commandFn] of Object.entries(commandMap)) {
            const description = commandFn.description || 'No description';
            const category = commandFn.category || 'General';
            if (!categorized[category]) categorized[category] = [];
            categorized[category].push({ cmd, description });
        }

        let menuText = `╭━〔 *🤖 ERNEST BOT MENU* 〕━⬣\n`;
        menuText += `┃ 🧠 Bot Owner: wa.me/${ownerNumber}\n`;
        menuText += `┃ ⚙️ Prefix: *${prefix}*\n`;
        menuText += `┃ 🧾 Commands: ${Object.keys(commandMap).length}\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━━⬣\n\n`;

        for (const [category, cmds] of Object.entries(categorized)) {
            menuText += `╭───「 *📂 ${category.toUpperCase()}* 」───⬣\n`;
            for (const { cmd, description } of cmds) {
                const label = `${prefix}${cmd}`.padEnd(15);
                menuText += `│ . *${label}* ┇ _${description}_\n`;
            }
            menuText += `╰────────────────────────⬣\n\n`;
        }

        menuText += `*💡 TIP:* _Type ${prefix}help <command> for details._\n`;
        menuText += `🚀 _Made with ❤️ by Ernest Tech House_`;

        await sock.sendMessage(from, {
            image: { url: imageUrl },
            caption: menuText
        }, { quoted: msg });

    } catch (error) {
        console.error('❌ Error in menu:', error);
        await sock.sendMessage(from, { text: '❌ Failed to load menu. Try again later.' }, { quoted: msg });
    }
}

export const description = "Shows all available commands";
export const category = "General";

menu.description = "show all comands";
menu.category = "general";