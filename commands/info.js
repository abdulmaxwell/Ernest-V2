import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

export default async function info(sock, msg, from) {
    try {
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
        const botName = sock.user?.name || process.env.BOT_NAME || 'Unknown';

        let gitCommit = 'N/A';
        try {
            gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
        } catch {
            // No git commit, no crime
        }

        const infoBox = `
╔════════════════════════════╗
║          🤖 BOT INFO       ║
╠════════════════════════════╣
║ • Owner: ${process.env.BOT_OWNER || 'Ernest Pease'}      
║ • Bot Name: ${botName}     
║ • Version: ${process.env.BOT_VERSION || '1.0.0'}      
║ • Commands: ${process.env.BOT_COMMAND_COUNT || '25+'}            
║ • Uptime: ${hours}h ${minutes}m ${seconds}s 
║ • Prefix: ${process.env.PREFIX || '!'}          
║ • Memory: ${usedMem}MB / ${totalMem}MB
║ • Platform: ${platform}          
║ • Node.js: ${nodeVersion}       
║ • CPU: ${cpuModel.slice(0, 30)}...
║ • Git: ${gitCommit}        
║ • Number: ${sock.user?.id?.split(':')[0]}      
║ • Repo: ${process.env.BOT_REPO || 'github.com/ernest'}  
║ • Group: ${process.env.BOT_GROUP || 'chat.whatsapp.com/abc'} 
║ • Channel: ${process.env.BOT_CHANNEL || 'whatsapp.com/channel/xyz'} 
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
export const category = "system";

info.category  = "display system information";
info.category = "system";
