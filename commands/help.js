import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function help(sock, msg, from) {
    try {
        const commandPath = path.join(__dirname);
        const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js') && file !== 'help.js');

        let helpMessage = '*📖 ErnestBot Commands*\n\n';
        const categories = {};

        for (const file of commandFiles) {
            const { description = 'No description', category = 'General' } = await import(`./${file}?update=${Date.now()}`);
            const commandName = file.replace('.js', '');

            if (!categories[category]) categories[category] = [];
            categories[category].push({ commandName, description });
        }

        for (const category of Object.keys(categories)) {
            helpMessage += `*📂 ${category.toUpperCase()}*\n`;
            for (const cmd of categories[category]) {
                helpMessage += `• *${cmd.commandName}* - ${cmd.description}\n`;
            }
            helpMessage += `\n`;
        }

        await sock.sendMessage(from, { text: helpMessage.trim() }, { quoted: msg });

    } catch (err) {
        console.error('❌ Error loading help command:', err);
        await sock.sendMessage(from, { text: '⚠️ Failed to load help info.' }, { quoted: msg });
    }
}

export const description = "Displays this help menu";
export const category = "system";

help.description = "help menu";
help.category = "system";