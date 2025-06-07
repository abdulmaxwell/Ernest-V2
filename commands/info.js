import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

export default async function info(sock, msg, from) {
    try {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const memoryUsage = process.memoryUsage();
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1); // GB
        const usedMem = (memoryUsage.rss / 1024 / 1024).toFixed(0); // MB
        const platform = os.platform();
        const nodeVersion = process.version;
        const cpuModel = os.cpus()[0].model;
        const cpuCores = os.cpus().length;
        const botName = sock.user?.name || process.env.BOT_NAME || '🔥 BEAST BOT';
        const loadAvg = os.loadavg()[0].toFixed(2);

        let gitCommit = 'N/A';
        let gitBranch = 'main';
        try {
            gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
            gitBranch = execSync('git branch --show-current').toString().trim();
        } catch {
            // Git info not available
        }

        // Performance indicators
        const perfEmoji = usedMem < 100 ? '🚀' : usedMem < 200 ? '⚡' : '🔥';
        const statusEmoji = uptime > 86400 ? '💪' : uptime > 3600 ? '✅' : '🆕';

        // --- Feature Status Checks (NEW) ---
        const getStatusEmoji = (envVar) => process.env[envVar] === 'true' ? '✅' : '❌';

        const autoReadStatus = getStatusEmoji('AUTO_READ_MESSAGES');
        const antiDeleteStatus = getStatusEmoji('ANTI_DELETE_ENABLED');
        const autoViewStatusStatus = getStatusEmoji('AUTO_VIEW_STATUS_ENABLED');
        const autoViewChannelsStatus = getStatusEmoji('AUTO_VIEW_CHANNELS_ENABLED');
        const autoTypingStatus = getStatusEmoji('AUTO_TYPING_INDICATOR_ENABLED');
        const specialAlertsStatus = (process.env.SPECIAL_CONTACT_ALERTS && process.env.SPECIAL_CONTACT_ALERTS.length > 0) ? '✅' : '❌';
        const alwaysOnlineStatus = getStatusEmoji('ALWAYS_ONLINE');
        const botSignatureStatus = getStatusEmoji('BOT_SIGNATURE_ENABLED');
        const removeBgStatus = process.env.REMOVEBG_API_KEY && process.env.REMOVEBG_API_KEY !== 'YOUR_API_KEY' ? '✅' : '❌';
        const pythonApiStatus = process.env.PYTHON_API_URL && process.env.PYTHON_API_URL !== 'http://localhost:5000' ? '✅' : '❌'; // Assuming default means not enabled
        // --- END Feature Status Checks ---

        const infoBox = `
╔═══════════════════════════════════════════╗
║          ${perfEmoji} LEGENDARY BOT STATUS ${statusEmoji}           ║
╠═══════════════════════════════════════════╣
║ 👑 Owner: ${(process.env.BOT_OWNER || 'The Legend').padEnd(25)} ║
║ 🤖 Name: ${botName.padEnd(26)} ║
║ 🔥 Version: ${(process.env.BOT_VERSION || 'v2.0.0-BEAST').padEnd(23)} ║
║ ⚡ Commands: ${(process.env.BOT_COMMAND_COUNT || '50+').padEnd(22)} ║
║ 🕒 Uptime: ${`${days}d ${hours}h ${minutes}m ${seconds}s`.padEnd(23)} ║
║ 🎯 Prefix: ${(process.env.PREFIX || '!').padEnd(25)} ║
║ 💾 RAM: ${`${usedMem}MB / ${totalMem}GB`.padEnd(26)} ║
║ 🖥️  Platform: ${platform.toUpperCase().padEnd(21)} ║
║ 📦 Node.js: ${nodeVersion.padEnd(23)} ║
║ 🧠 CPU: ${`${cpuCores}x ${cpuModel.slice(0, 20)}...`.padEnd(26)} ║
║ 📊 Load: ${loadAvg.padEnd(27)} ║
║ 🌿 Branch: ${gitBranch.padEnd(25)} ║
║ 📝 Commit: ${gitCommit.padEnd(25)} ║
║ 📱 Number: ${(sock.user?.id?.split(':')[0] || 'Private').padEnd(23)} ║
║ 🔗 Repo: ${(process.env.BOT_REPO || 'github.com/legend').padEnd(25)} ║
║ 👥 Group: ${(process.env.BOT_GROUP || 'Private Group').padEnd(25)} ║
║ 📢 Channel: ${(process.env.BOT_CHANNEL || 'Private Channel').padEnd(23)} ║
╠═══════════════════════════════════════════╣
║          🌐 FEATURE STATUS 🌐          ║
╠═══════════════════════════════════════════╣
║ ${autoReadStatus} Auto-Read Msgs: ${(autoReadStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(20)} ║
║ ${antiDeleteStatus} Anti-Delete: ${(antiDeleteStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(22)} ║
║ ${autoViewStatusStatus} Auto-View Status: ${(autoViewStatusStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(18)} ║
║ ${autoViewChannelsStatus} Auto-View Channels: ${(autoViewChannelsStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(16)} ║
║ ${autoTypingStatus} Auto-Typing: ${(autoTypingStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(20)} ║
║ ${specialAlertsStatus} Special Alerts: ${(specialAlertsStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(19)} ║
║ ${alwaysOnlineStatus} Always Online: ${(alwaysOnlineStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(19)} ║
║ ${botSignatureStatus} Bot Signature: ${(botSignatureStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(19)} ║
║ ${removeBgStatus} RemoveBG API: ${(removeBgStatus === '✅' ? 'Active' : 'Inactive').padEnd(20)} ║
║ ${pythonApiStatus} Python API: ${(pythonApiStatus === '✅' ? 'Active' : 'Inactive').padEnd(22)} ║
╚═══════════════════════════════════════════╝
`.trim();

        // Send main info
        await sock.sendMessage(from, {
            text: infoBox,
            contextInfo: {
                mentionedJid: [sock.user?.id],
                externalAdReply: {
                    title: `${botName} - System Status`,
                    body: `Uptime: ${days}d ${hours}h | RAM: ${usedMem}MB`,
                    thumbnailUrl: process.env.BOT_LOGO_URL || '', // Ensure BOT_LOGO_URL is set in .env
                    sourceUrl: process.env.BOT_REPO || '',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });

        // Performance status message
        const perfMessage = usedMem < 100 ? 
            "🚀 *BEAST MODE ACTIVATED* - Running at peak performance!" :
            usedMem < 200 ? 
            "⚡ *HIGH PERFORMANCE* - Systems operating smoothly!" :
            "🔥 *LEGENDARY STATUS* - Heavy lifting like a champion!";

        setTimeout(async () => {
            await sock.sendMessage(from, {
                text: perfMessage
            });
        }, 1000);

        // Optional: Send audio/video if exists
        const mediaPath = './media/bot-info.mp4'; // Make sure this path is correct
        if (fs.existsSync(mediaPath)) {
            setTimeout(async () => {
                await sock.sendMessage(from, {
                    video: fs.readFileSync(mediaPath),
                    caption: "🤖 Bot Status Video Update!",
                    mimetype: 'video/mp4'
                }, { quoted: msg });
            }, 2000);
        }

        // Optional: System health check
        if (days >= 7) {
            setTimeout(async () => {
                await sock.sendMessage(from, {
                    text: "🏆 *LEGENDARY MILESTONE* - Bot has been running for a week straight! 💪"
                });
            }, 3000);
        }

    } catch (error) {
        console.error('Error in info command:', error);
        await sock.sendMessage(from, {
            text: '💥 *SYSTEM ERROR* - Failed to fetch legendary status! 🔧\n\n_Debugging in progress..._'
        }, { quoted: msg });
    }
}

export const description = "🚀 Displays LEGENDARY bot information with full system stats and performance metrics 💪";
export const category = "system";

// Redundant, but harmless:
info.description = "🚀 Displays LEGENDARY bot information with full system stats and performance metrics 💪";
info.category = "system";