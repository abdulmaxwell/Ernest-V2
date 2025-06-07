import dotenv from 'dotenv';
dotenv.config();

export default async function creator(sock, msg, from) {
    try {
        // Get creator details from .env
        const creatorName = process.env.CREATOR_NAME || "Peace Ernest";
        const creatorTitle = process.env.CREATOR_TITLE || "Founder, Ernest Tech House";
        const creatorMotto = process.env.CREATOR_MOTTO || "Build loud. Move smart.";
        const creatorEmail = process.env.CREATOR_EMAIL || "peace@dev.com";
        const creatorNumber = process.env.CREATOR_NUMBER || ""; // Use the number from .env
        const creatorYouTubeUrl = process.env.CREATOR_YOUTUBE_URL || "https://youtube.com/ErnestTechHouse";
        const creatorPortfolioUrl = process.env.CREATOR_PORTFOLIO_URL || "https://github.com/PeaseErnest12287";
        const creatorPfpUrl = process.env.CREATOR_PFP_URL || ""; // Your profile picture URL

        const creatorBox = `
╔════════════════════════════════════════╗
║          👑 *${creatorName.toUpperCase()} PROFILE* 👑          ║
╠════════════════════════════════════════╣
║ • Name: ${creatorName.padEnd(30)} ║
║ • Title: ${creatorTitle.padEnd(29)} ║
║ • Role: Full-Stack Dev, Visionary 🧠     ║
║ • Languages: JS, Python, Bash, +more     ║
║ • Projects: 50+ (bots, games, tools)     ║
║ • Skills: AI, Web Dev, Automation 🤖     ║
║ • Motto: "${creatorMotto}"     ║
║ • Contact: ${creatorEmail.padEnd(27)} ║
║ • WhatsApp: ${creatorNumber.padEnd(26)} ║
║ • YouTube: Ernest Tech House 📺          ║
║ • Future: Ernest OS, ErnestNet 💻        ║
╚════════════════════════════════════════╝
`.trim();

        const buttons = [
            { buttonId: 'chat_creator', buttonText: { displayText: '💬 Chat with Creator' }, type: 1 },
            { buttonId: 'email_creator', buttonText: { displayText: '📧 Email Creator' }, type: 1 },
            { buttonId: 'youtube_creator', buttonText: { displayText: '📺 Visit YouTube' }, type: 1 },
            { buttonId: 'portfolio_creator', buttonText: { displayText: '🔗 View Portfolio' }, type: 1 }
        ];

        const buttonMessage = {
            text: creatorBox,
            footer: 'Tap a button to connect!',
            buttons: buttons,
            headerType: 1,
            contextInfo: {
                mentionedJid: [], // No specific JID to mention here
                externalAdReply: {
                    title: `${creatorName} - Founder of Ernest Tech House`,
                    body: creatorMotto,
                    thumbnailUrl: creatorPfpUrl, // Your profile picture URL
                    sourceUrl: creatorPortfolioUrl, // Your portfolio/GitHub URL
                    mediaType: 1, // IMAGE
                    renderLargerThumbnail: true
                }
            }
        };

        await sock.sendMessage(from, buttonMessage, { quoted: msg });

    } catch (error) {
        console.error('Error in creator command:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to fetch creator info. Debugging in progress... 🔧'
        }, { quoted: msg });
    }
}

export const description = "👑 Displays the legendary Peace Ernest's profile with contact options!";
export const category = "about";