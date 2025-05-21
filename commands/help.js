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





// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import baileys from '@whiskeysockets/baileys';
// const { generateWAMessageFromContent, proto } = baileys;


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export default async function help(sock, msg, from) {
//     try {
//         const commandPath = path.join(__dirname);
//         const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js') && file !== 'help.js');

//         // Organize commands by category
//         const categories = {};
//         for (const file of commandFiles) {
//             const { description = 'No description', category = 'General' } = await import(`./${file}?update=${Date.now()}`);
//             const commandName = file.replace('.js', '');
            
//             if (!categories[category]) categories[category] = [];
//             categories[category].push({ commandName, description });
//         }

//         // Create interactive message with buttons
//         const categoryButtons = Object.keys(categories).map(category => ({
//             name: 'quick_reply',
//             buttonParamsJson: JSON.stringify({
//                 display_text: category,
//                 id: `help_category_${category.toLowerCase()}`
//             })
//         }));

//         // Create the interactive message
//         const interactiveMsg = generateWAMessageFromContent(from, {
//             viewOnceMessage: {
//                 message: {
//                     interactiveMessage: proto.Message.InteractiveMessage.create({
//                         body: proto.Message.InteractiveMessage.Body.create({
//                             text: "📚 *ErnestBot Command Center*\n\nSelect a category to view available commands:"
//                         }),
//                         footer: proto.Message.InteractiveMessage.Footer.create({
//                             text: "Powered by ErnestBot v2"
//                         }),
//                         header: proto.Message.InteractiveMessage.Header.create({
//                             title: "Command Help",
//                             subtitle: "Interactive Menu",
//                             hasMediaAttachment: false
//                         }),
//                         buttons: [
//                             {
//                                 name: "quick_reply",
//                                 buttonParamsJson: JSON.stringify({
//                                     display_text: "Show All Commands",
//                                     id: "help_show_all"
//                                 })
//                             },
//                             ...categoryButtons
//                         ]
//                     })
//                 }
//             }
//         }, {});

//         // Send the interactive message
//         await sock.relayMessage(
//             from, 
//             interactiveMsg.message, 
//             { messageId: interactiveMsg.key.id }
//         );

//     } catch (err) {
//         console.error('❌ Error loading help command:', err);
//         // Fallback to simple text if interactive fails
//         await sock.sendMessage(from, { 
//             text: '⚠️ Failed to load interactive help. Here are basic commands:\n\n' +
//                   '!help - Show this menu\n' +
//                   '!text - Broadcast messages\n' +
//                   '!info - Bot information'
//         }, { quoted: msg });
//     }
// }

// export const description = "Displays interactive help menu with buttons";
// export const category = "system";

// help.description = description;
// help.category = category;