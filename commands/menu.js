export default async function menu(sock, msg, from) {
    try {
        const prefix = process.env.PREFIX || '!';
        let menuText = `
╔════════════════════════════════╗
║          📜 BOT MENU           ║
╠════════════════════════════════╣\n`;

        for (const [cmd, desc] of Object.entries(commandDescriptions)) {
            menuText += `║ ${prefix}${cmd.padEnd(15)} ${desc.padEnd(20)} ║\n`;
        }

        menuText += `╚════════════════════════════════╝\n\n`;
        menuText += `📝 _Type ${prefix}help <command> for more info_`;

        await sock.sendMessage(from, { text: menuText }, { quoted: msg });
    } catch (error) {
        console.error('Error in menu:', error);
        await sock.sendMessage(from, { text: '❌ Failed to load menu' }, { quoted: msg });
    }
}

export const description = "Shows all available commands";