// commands/repo.js
import dotenv from "dotenv";
dotenv.config();

export default async function repo(sock, msg, from) {
    try {
        const repotext = `
┏━━━👨‍💻 Ernest Tech House ━━━┓
┃ 🤖 *Bot Repository Info*      
┃ 💡 Built with love, logic, 
┃     and way too much caffeine.
┃ 
┃ 🔗 *GitHub:* 
┃ https://github.com/PeaseErnest12287/Ernest-V2
┃ 📄 *Docs:* ernest.tech/docs
┃ 🧠 *Creator:* Ernest the Legend
┃ 
┃ ✨ Stay curious. Stay sharp.
┗━━━━━━━━━━━━━━━━━━━━━━┛
`;


        const imageUrl = process.env.BOT_IMAGE || 'https://avatars.githubusercontent.com/u/173539960?s=400&v=4';

        await sock.sendMessage(from, {
            image: { url: imageUrl },
            caption: repotext
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in repo command:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to fetch repo details, srry!'
        }, { quoted: msg });
    }
}

repo.category = "bot info";
repo.description = "Show the bot's main repo.";
