import fs from 'fs';

export default async function info(sock, msg, from) {
    try {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const infoBox = `
╔════════════════════════════╗
║          🤖 BOT INFO       ║
╠════════════════════════════╣
║ • Owner: Ernest Maloba     ║
║ • Commands: 25+            ║
║ • Uptime: ${hours}h ${minutes}m ${seconds}s ║
║ • User: ${sock.user?.name || 'Unknown'} ║
║ • Number: +1234567890      ║
║ • Repo: github.com/ernest  ║
║ • Group: chat.whatsapp.com/abc ║
║ • Channel: whatsapp.com/channel/xyz ║
╚════════════════════════════╝
`.trim();

        await sock.sendMessage(from, { 
            text: infoBox,
            contextInfo: {
                mentionedJid: [sock.user?.id]
            }
        });

        // Send audio file if available
        const audioPath = './media/bot-info.mp4';
        if (fs.existsSync(audioPath)) {
            await sock.sendMessage(from, {
                audio: fs.readFileSync(audioPath),
                mimetype: 'audio/mp4'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Error in info:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to send bot info',
            quoted: msg 
        });
    }
}

export const description = "Displays comprehensive bot information";