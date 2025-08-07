import dotenv from "dotenv";
dotenv.config(); // Ensure this is at the very top to load env variables first

// Recommended Baileys import style for ES Modules
import pkg from "@whiskeysockets/baileys";
const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    jidNormalizedUser // Import for normalizing JIDs
} = pkg;

import pino from "pino";
import fs from "fs/promises";
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { messageHandler } from "./handlers/messageHandler.js";
import express from "express";
import { initScheduler } from './lib/scheduler.js';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
    AUTH_FOLDER: join(__dirname, "data", "auth_state"),
    SESSIONS_FOLDER: join(__dirname, "data", "sessions"), // New folder for session storage
    LOG_FILE: join(__dirname, "bot.log"),
    MAX_RETRIES: 5,
    RETRY_DELAY: 5000,
    PORT: process.env.PORT || 3000,
    BOT_VERSION: process.env.BOT_VERSION || "2.1.0",
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN // Telegram bot token
};

// Ensure directories exist
async function ensureFolders() {
    try {
        await fs.mkdir(config.AUTH_FOLDER, { recursive: true });
        await fs.mkdir(config.SESSIONS_FOLDER, { recursive: true });
        logger.info("📁 Folders ensured.");
    } catch (err) {
        logger.error("❌ Failed to create folders:", err);
        process.exit(1);
    }
}

// Logger setup
const logger = pino({
    level: process.env.LOG_LEVEL || "debug",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    },
});

// WhatsApp Bot Class with Telegram integration
class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.retryCount = 0;
        this.afkUsers = new Map();
        this.app = express();
        this.telegramBot = null;
        this.activeSessions = new Map(); // Track active sessions
        this.pendingPairings = new Map(); // Track pending pairing requests
    }

    async start() {
        logger.info("🚀 Starting Ernest Tech House Bot...");
        try {
            await ensureFolders();
            
            // Initialize Telegram bot if token is provided
            if (config.TELEGRAM_TOKEN) {
                await this.initTelegramBot();
            } else {
                logger.warn("Telegram token not provided. Telegram features disabled.");
            }

            const credsPath = join(config.AUTH_FOLDER, "creds.json");
            const credsExist = await fs.access(credsPath).then(() => true).catch(() => false);
            
            if (!credsExist && process.env.WHATSAPP_SESSION) {
                await this.initializeSession();
            } else if (!credsExist) {
                logger.info("No existing session found. Waiting for pairing via Telegram.");
            } else {
                logger.info("Credentials found, connecting to WhatsApp...");
            }

            this.setupExpressServer();
            
            // Connect to WhatsApp if we have credentials
            if (credsExist) {
                await this.connectWhatsApp();
            }

        } catch (err) {
            logger.error("💥 Bot startup failed:", err);
            await this.handleRetry();
        }
    }

    async initTelegramBot() {
        logger.info("🤖 Initializing Telegram bot...");
        this.telegramBot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });

        // Telegram bot commands
        this.telegramBot.onText(/\/start/, (msg) => this.handleTelegramStart(msg));
        this.telegramBot.onText(/\/pair/, (msg) => this.handleTelegramPair(msg));
        this.telegramBot.onText(/\/status/, (msg) => this.handleTelegramStatus(msg));
        this.telegramBot.onText(/\/list/, (msg) => this.handleTelegramListSessions(msg));
        this.telegramBot.onText(/\/restart/, (msg) => this.handleTelegramRestart(msg));
        this.telegramBot.on('message', (msg) => this.handleTelegramMessage(msg));

        logger.info("✅ Telegram bot initialized.");
    }

    // Telegram command handlers
    async handleTelegramStart(msg) {
        const chatId = msg.chat.id;
        const welcomeMessage = `
🤖 *Welcome to WhatsApp Pairing Bot* 🤖

This bot helps you manage your WhatsApp sessions.

📌 *Available Commands:*
/pair - Start a new WhatsApp pairing
/status - Check current session status
/list - List all saved sessions
/restart - Restart the WhatsApp connection

⚠️ *Note:* You need to pair only once. Sessions are saved automatically.
`;
        await this.telegramBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    }

    async handleTelegramPair(msg) {
        const chatId = msg.chat.id;
        
        // Check if already paired
        const sessionPath = join(config.SESSIONS_FOLDER, `session_${chatId}.json`);
        if (await fs.access(sessionPath).then(() => true).catch(() => false)) {
            return this.telegramBot.sendMessage(chatId, "You already have a paired session. Use /restart if you need to reconnect.");
        }

        this.pendingPairings.set(chatId, { step: 'awaiting_number' });
        
        const promptMessage = `
📱 *WhatsApp Pairing Process* 

Please send your WhatsApp number in international format:
- Include country code
- No spaces or symbols
- Example: 254712345678

⚠️ *Important:* 
- This must be the number of the phone with WhatsApp installed
- You'll receive the pairing code here
`;
        
        await this.telegramBot.sendMessage(chatId, promptMessage, { parse_mode: 'Markdown' });
    }

    async handleTelegramStatus(msg) {
        const chatId = msg.chat.id;
        const sessionPath = join(config.SESSIONS_FOLDER, `session_${chatId}.json`);
        
        if (!await fs.access(sessionPath).then(() => true).catch(() => false)) {
            return this.telegramBot.sendMessage(chatId, "❌ No active session found. Use /pair to start pairing.");
        }

        const statusMessage = `
📊 *Session Status*

✅ Session exists and is saved
🔗 WhatsApp connection: ${this.sock ? "Connected" : "Disconnected"}
🔄 Auto-reconnect enabled

Use /restart to refresh the connection if needed.
`;
        await this.telegramBot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
    }

    async handleTelegramListSessions(msg) {
        const chatId = msg.chat.id;
        
        try {
            const files = await fs.readdir(config.SESSIONS_FOLDER);
            const sessionFiles = files.filter(file => file.startsWith('session_') && file.endsWith('.json'));
            
            if (sessionFiles.length === 0) {
                return this.telegramBot.sendMessage(chatId, "No saved sessions found.");
            }
            
            let message = "📋 *Saved Sessions*\n\n";
            sessionFiles.forEach(file => {
                const sessionId = file.replace('session_', '').replace('.json', '');
                message += `- Session ID: ${sessionId}\n`;
            });
            
            await this.telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error("Error listing sessions:", error);
            await this.telegramBot.sendMessage(chatId, "❌ Error listing sessions.");
        }
    }

    async handleTelegramRestart(msg) {
        const chatId = msg.chat.id;
        const sessionPath = join(config.SESSIONS_FOLDER, `session_${chatId}.json`);
        
        if (!await fs.access(sessionPath).then(() => true).catch(() => false)) {
            return this.telegramBot.sendMessage(chatId, "❌ No session found to restart. Use /pair first.");
        }

        try {
            await this.telegramBot.sendMessage(chatId, "🔄 Restarting WhatsApp connection...");
            
            // Clean up existing connection
            if (this.sock) {
                await this.sock.end();
                this.sock.ev.removeAllListeners();
            }
            
            // Reconnect
            await this.connectWhatsApp();
            await this.telegramBot.sendMessage(chatId, "✅ WhatsApp connection restarted successfully.");
        } catch (error) {
            logger.error("Error restarting connection:", error);
            await this.telegramBot.sendMessage(chatId, "❌ Failed to restart connection.");
        }
    }

    async handleTelegramMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        if (!this.pendingPairings.has(chatId)) return;
        if (text.startsWith('/')) return;
        
        const pairingData = this.pendingPairings.get(chatId);
        
        if (pairingData.step === 'awaiting_number') {
            const cleanNumber = text.replace(/[^0-9]/g, '');
            
            if (!cleanNumber || cleanNumber.length < 8) {
                return this.telegramBot.sendMessage(chatId, '❌ Invalid number format. Please send your WhatsApp number in international format (e.g., 254712345678)');
            }
            
            pairingData.number = cleanNumber;
            pairingData.step = 'processing';
            this.pendingPairings.set(chatId, pairingData);
            
            try {
                await this.telegramBot.sendMessage(chatId, '⏳ Requesting pairing code from WhatsApp...');
                
                // Generate a unique ID for this session
                const sessionId = `telegram_${chatId}`;
                const sessionPath = join(config.AUTH_FOLDER, sessionId);
                
                // Create session directory
                await fs.mkdir(sessionPath, { recursive: true });
                
                const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
                
                // Create temporary WhatsApp connection
                const sock = makeWASocket({
                    auth: {
                        creds: state.creds,
                        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
                    },
                    printQRInTerminal: false,
                    logger: pino({ level: "silent" }),
                });
                
                // Store the socket for this pairing
                pairingData.sock = sock;
                pairingData.sessionPath = sessionPath;
                pairingData.saveCreds = saveCreds;
                this.pendingPairings.set(chatId, pairingData);
                
                // Handle connection updates
                sock.ev.on("connection.update", async (update) => {
                    if (update.connection === 'connecting') {
                        if (!sock.authState.creds.registered) {
                            try {
                                const code = await sock.requestPairingCode(cleanNumber);
                                await this.telegramBot.sendMessage(chatId, `🔢 Your WhatsApp pairing code:\n\n*${code}*\n\nEnter this in WhatsApp under:\nLinked Devices > Link with phone number`, { parse_mode: 'Markdown' });
                            } catch (error) {
                                logger.error("Pairing error:", error);
                                await this.telegramBot.sendMessage(chatId, "❌ Failed to get pairing code. Please try again.");
                                this.cleanupPairing(chatId);
                            }
                        }
                    } else if (update.connection === "open") {
                        // Session is connected
                        await this.handleSuccessfulPairing(chatId, sock, sessionPath);
                    } else if (update.connection === "close") {
                        this.cleanupPairing(chatId);
                    }
                });
                
                // Save credentials when updated
                sock.ev.on("creds.update", saveCreds);
                
            } catch (error) {
                logger.error("Pairing error:", error);
                await this.telegramBot.sendMessage(chatId, "❌ Failed to start pairing process. Please try again.");
                this.cleanupPairing(chatId);
            }
        }
    }

    async handleSuccessfulPairing(chatId, sock, sessionPath) {
        try {
            // Read the credentials
            const credsPath = join(sessionPath, 'creds.json');
            const credsData = await fs.readFile(credsPath, 'utf-8');
            const creds = JSON.parse(credsData);
            
            // Save the session for future use
            const sessionSavePath = join(config.SESSIONS_FOLDER, `session_${chatId}.json`);
            await fs.writeFile(sessionSavePath, credsData);
            
            // Store the active session
            this.activeSessions.set(chatId, {
                sock,
                creds,
                sessionPath
            });
            
            // Notify user
            await this.telegramBot.sendMessage(chatId, "✅ WhatsApp pairing successful! Your session has been saved.\n\nYou can now use /status to check your connection.");
            
            // Send welcome message via WhatsApp
            const welcomeMessage = `
┏━━━━━━━━━━━━━━━━━━━
┃ Thank you for pairing with us!
┃ Your session has been saved.
┃ You won't need to pair again.
┗━━━━━━━━━━━━━━━━━━━
`;
            await sock.sendMessage(sock.user.id, { text: welcomeMessage });
            
            // Clean up the pairing process
            this.pendingPairings.delete(chatId);
            
            // If this is the first session, set it as the main connection
            if (!this.sock) {
                this.sock = sock;
                this.setupEventHandlers(() => {});
                messageHandler(sock);
                initScheduler(sock);
            }
            
        } catch (error) {
            logger.error("Error handling successful pairing:", error);
            await this.telegramBot.sendMessage(chatId, "❌ Error saving your session. Please try pairing again.");
            this.cleanupPairing(chatId);
        }
    }

    cleanupPairing(chatId) {
        if (this.pendingPairings.has(chatId)) {
            const pairingData = this.pendingPairings.get(chatId);
            if (pairingData.sock) {
                pairingData.sock.end().catch(() => {});
            }
            if (pairingData.sessionPath) {
                fs.rm(pairingData.sessionPath, { recursive: true }).catch(() => {});
            }
            this.pendingPairings.delete(chatId);
        }
    }

    async initializeSession() {
        logger.info("🔑 Initializing WhatsApp session...");
        if (!process.env.WHATSAPP_SESSION) {
            logger.error("❌ WHATSAPP_SESSION environment variable not set.");
            throw new Error("WHATSAPP_SESSION environment variable not set");
        }

        try {
            const decoded = Buffer.from(process.env.WHATSAPP_SESSION, "base64").toString("utf-8");
            const session = JSON.parse(decoded);
            const credsPath = join(config.AUTH_FOLDER, "creds.json");

            await fs.writeFile(credsPath, JSON.stringify(session, null, 2));
            logger.info("✅ Session initialized from environment variable.");
            return true;
        } catch (err) {
            logger.error("❌ Session initialization failed:", err);
            throw err;
        }
    }

    setupExpressServer() {
        logger.info(`🌐 Initializing health check server on port ${config.PORT}...`);
        this.app.get("/health", (req, res) => {
            res.status(200).json({
                status: "running",
                connected: !!this.sock,
                telegram: !!this.telegramBot,
                sessions: this.activeSessions.size
            });
        });

        this.app.listen(config.PORT, () => {
            logger.info(`✅ Health server listening on port ${config.PORT}.`);
        });
    }

    async connectWhatsApp() {
        logger.info("🤝 Connecting to WhatsApp...");
        const { state, saveCreds } = await useMultiFileAuthState(config.AUTH_FOLDER);

        this.sock = makeWASocket({
            auth: state,
            logger: pino({ level: "silent" }),
            browser: Browsers.macOS("Desktop"),
            printQRInTerminal: false,
            shouldSyncHistoryMessage: () => false,
            syncFullHistory: false,
            markOnlineOnConnect: process.env.ALWAYS_ONLINE === 'true'
        });

        this.setupEventHandlers(saveCreds);
        messageHandler(this.sock);
        initScheduler(this.sock);

        logger.info("✅ WhatsApp connection initialized.");
    }

    setupEventHandlers(saveCreds) {
        logger.info("⚙️ Setting up WhatsApp event handlers...");
        this.sock.ev.on("connection.update", async (update) => {
            if (update.connection === "close") {
                await this.handleDisconnection(update.lastDisconnect);
            }

            if (update.connection === "open") {
                await this.handleSuccessfulConnection();
            }
        });

        this.sock.ev.on("creds.update", saveCreds);
        logger.info("✅ Event handlers registered.");
    }

    async handleDisconnection(lastDisconnect) {
        const code = lastDisconnect?.error?.output?.statusCode ||
                     lastDisconnect?.error?.output?.payload?.statusCode;

        logger.warn(`Connection closed (Code: ${code || "unknown"})`);

        if (code === DisconnectReason.loggedOut) {
            logger.error("Session logged out. ⚠️ Please generate a new session.");
            try {
                await fs.unlink(join(config.AUTH_FOLDER, "creds.json"));
                logger.info("Deleted old creds.json.");
            } catch (err) {
                logger.error("Failed to delete creds.json:", err);
            }
            return;
        }

        await this.handleRetry();
    }

    async handleSuccessfulConnection() {
        this.retryCount = 0;
        const user = this.sock.user;
        logger.info(`✅ Bot connected as ${user?.id?.split(':')[0] || "unknown"}!`);

        try {
            await this.sendConnectionNotification(user.id);
            
            // Notify Telegram users with active sessions
            if (this.telegramBot) {
                for (const [chatId, session] of this.activeSessions) {
                    if (session.sock.user.id === user.id) {
                        await this.telegramBot.sendMessage(chatId, 
                            "✅ WhatsApp connection established successfully!\n\nYour session is now active.");
                    }
                }
            }
        } catch (err) {
            logger.error("❌ Failed to send connection notification:", err);
        }
    }

    async sendConnectionNotification(userId) {
        const ownerJid = process.env.OWNER_NUMBER ? jidNormalizedUser(process.env.OWNER_NUMBER.split('@')[0]) : null;

        if (!ownerJid) {
            logger.warn("OWNER_NUMBER not set or invalid in .env. Skipping connection notification.");
            return;
        }

        const getStatusEmoji = (envVar) => process.env[envVar] === 'true' ? '✅' : '❌';
        const botName = process.env.BOT_NAME || 'ErnestBot';

        const autoReadStatus = getStatusEmoji('AUTO_READ_MESSAGES');
        const antiDeleteStatus = getStatusEmoji('ANTI_DELETE_ENABLED');
        const autoViewStatusStatus = getStatusEmoji('AUTO_VIEW_STATUS_ENABLED');
        const sendStatusNotifStatus = getStatusEmoji('SEND_STATUS_VIEW_NOTIFICATION_ENABLED');
        const autoViewChannelsStatus = getStatusEmoji('AUTO_VIEW_CHANNELS_ENABLED');
        const autoTypingStatus = getStatusEmoji('AUTO_TYPING_INDICATOR_ENABLED');
        const specialAlertsList = process.env.SPECIAL_CONTACT_ALERTS;
        const specialAlertsStatus = (specialAlertsList && specialAlertsList.split(',').filter(Boolean).length > 0) ? '✅' : '❌';
        const alwaysOnlineStatus = getStatusEmoji('ALWAYS_ONLINE');
        const botSignatureStatus = getStatusEmoji('BOT_SIGNATURE_ENABLED');
        const removeBgStatus = process.env.REMOVEBG_API_KEY && process.env.REMOVEBG_API_KEY !== 'YOUR_API_KEY' && process.env.REMOVEBG_API_KEY !== '' ? '✅' : '❌';
        const pythonApiStatus = process.env.PYTHON_API_URL && process.env.PYTHON_API_URL !== 'http://localhost:5000' && process.env.PYTHON_API_URL !== '' ? '✅' : '❌';
        const weatherApiStatus = process.env.WEATHER_API_KEY && process.env.WEATHER_API_KEY !== 'YOUR_WEATHER_API_KEY' && process.env.WEATHER_API_KEY !== '' ? '✅' : '❌';
        const geminiApiStatus = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY' && process.env.GEMINI_API_KEY !== '' ? '✅' : '❌';
        const voiceRssApiStatus = process.env.VOICE_RSS_API_KEY && process.env.VOICE_RSS_API_KEY !== 'YOUR_VOICE_RSS_API_KEY' && process.env.VOICE_RSS_API_KEY !== '' ? '✅' : '❌';

        let commandCount = 'N/A';
        try {
            const files = await readdir(join(__dirname, 'commands'));
            commandCount = files.filter(file => file.endsWith('.js')).length;
        } catch (e) {
            logger.error("Error counting commands:", e);
        }

        const message = `
╔═══════════════════════════════════════════╗
║         *${botName.toUpperCase()} - SYSTEM ONLINE* ║
╠═══════════════════════════════════════════╣
║ 👑 Owner: ${(ownerJid ? ownerJid.split('@')[0] : 'Not Set').padEnd(25)} ║
║ 🤖 Version: ${config.BOT_VERSION.padEnd(25)} ║
║ ⚡ Commands Loaded: ${String(commandCount).padEnd(16)} ║
║ 👥 Active Sessions: ${String(this.activeSessions.size).padEnd(15)} ║
╠═══════════════════════════════════════════╣
║           *FEATURE STATUS* ║
╠═══════════════════════════════════════════╣
║ ${autoReadStatus} Auto-Read Msgs: ${(autoReadStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(20)} ║
║ ${antiDeleteStatus} Anti-Delete: ${(antiDeleteStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(22)} ║
║ ${autoViewStatusStatus} Auto-View Status: ${(autoViewStatusStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(18)} ║
║ ${sendStatusNotifStatus} Status Notifs: ${(sendStatusNotifStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(19)} ║
║ ${autoViewChannelsStatus} Auto-View Channels: ${(autoViewChannelsStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(16)} ║
║ ${autoTypingStatus} Auto-Typing: ${(autoTypingStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(20)} ║
║ ${specialAlertsStatus} Special Alerts: ${(specialAlertsStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(19)} ║
║ ${alwaysOnlineStatus} Always Online: ${(alwaysOnlineStatus === '✅' ? 'Enabled' : 'Disabled').padEnd(19)} ║
║ ${removeBgStatus} RemoveBG API: ${(removeBgStatus === '✅' ? 'Active' : 'Inactive').padEnd(20)} ║
║ ${pythonApiStatus} Python API: ${(pythonApiStatus === '✅' ? 'Active' : 'Inactive').padEnd(22)} ║
║ ${weatherApiStatus} Weather API: ${(weatherApiStatus === '✅' ? 'Active' : 'Inactive').padEnd(21)} ║
║ ${geminiApiStatus} Gemini API: ${(geminiApiStatus === '✅' ? 'Active' : 'Inactive').padEnd(22)} ║
║ ${voiceRssApiStatus} VoiceRSS API: ${(voiceRssApiStatus === '✅' ? 'Active' : 'Inactive').padEnd(19)} ║
╚═══════════════════════════════════════════╝
`.trim();

        await this.sock.sendMessage(ownerJid, { text: message });
        logger.info("✅ Sent bot connection notification to owner.");
    }

    async handleRetry() {
        if (this.retryCount < config.MAX_RETRIES) {
            this.retryCount++;
            logger.warn(`🔄 Retrying connection (${this.retryCount}/${config.MAX_RETRIES})...`);
            setTimeout(() => this.start(), config.RETRY_DELAY);
        } else {
            logger.error("❌ Max retries reached. Shutting down.");
            process.exit(1);
        }
    }

    async cleanup() {
        logger.info("🧹 Initiating bot cleanup...");
        if (this.sock) {
            try {
                await this.sock.end();
                this.sock.ev.removeAllListeners();
                logger.info("✅ WhatsApp socket closed.");
            } catch (err) {
                logger.error("❌ Cleanup error:", err);
            }
        }
        
        if (this.telegramBot) {
            this.telegramBot.stopPolling();
            logger.info("✅ Telegram bot stopped.");
        }
    }
}

// Process handlers
process.on("SIGINT", async () => {
    logger.info("🛑 SIGINT received. Shutting down gracefully...");
    await bot.cleanup();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    logger.info("🛑 SIGTERM received. Shutting down gracefully...");
    await bot.cleanup();
    process.exit(0);
});

// Start the bot
const bot = new WhatsAppBot();
bot.start().catch(err => {
    logger.error("💥 Fatal error during bot startup:", err);
    process.exit(1);
});
