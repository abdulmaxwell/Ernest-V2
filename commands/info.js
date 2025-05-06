import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';

export default async function info(sock, msg, from) {
    try {
        // Dynamically import package.json safely
        const { version } = (await import('../package.json', {
            assert: { type: 'json' }
        })).default;

        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const memoryUsage = process.memoryUsage();
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
        const usedMem = (memoryUsage.rss / 1024 / 1024).toFixed(0);
        const platform = os.platform();
        const nodeVersion = process.version;
        const cpuModel = os.cpus()[0].model;
        const botName = sock.user?.name || 'Unknown';

        let gitCommit = 'N/A';
        try {
            gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
        } catch (err) {
            // Git not available, ignore
        }

        const infoBox = `
╔════════════════════════════╗
║          🤖 BOT INFO       ║
╠════════════════════════════╣
║ • Owner: Ernest Maloba     ║
║ • Bot Name: ${botName}     
║ • Version: ${version}      
║ • Commands: 25+            ║
║ • Uptime: ${hours}h ${minutes}m ${seconds}s 
║ • Prefix: ${process.env.PREFIX || '!'}          
║ • Memory: ${usedMem}MB / ${totalMem}MB
║ • Platform: ${platform}          
║ • Node.js: ${nodeVersion}       
║ • CPU: ${cpuModel.slice(0, 30)}...
║ • Git: ${gitCommit}        
║ • Number: ${sock.user?.id?.split(':')[0]}      
║ • Repo: github.com/ernest  
║ • Group: chat.whatsapp.com/abc 
║ • Channel: whatsapp.com/channel/xyz 
╚════════════════════════════╝
`.trim();

        await sock.sendMessage(from, { 
            text: infoBox,
            contextInfo: {
                mentionedJid: [sock.user?.id]
            }
        });

        const audioPath = './media/bot-info.mp4';
        if (fs.existsSync(audioPath)) {
            await sock.sendMessage(from, {
                audio: fs.readFileSync(audioPath),
                mimetype: 'audio/mp4'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Error in info command:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to send bot info',
            quoted: msg 
        });
    }
}

export const description = "Displays full bot information including system stats and version";
