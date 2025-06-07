import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    jidNormalizedUser // Import for normalizing JIDs
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs/promises";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { messageHandler } from "./handlers/messageHandler.js";
import express from "express";
import { initScheduler } from './lib/scheduler.js';
import { readdir } from 'fs/promises'; // Import readdir for counting commands

// Configure environment
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
    AUTH_FOLDER: join(__dirname, "data", "auth_state"),
    LOG_FILE: join(__dirname, "bot.log"),
    MAX_RETRIES: 5,
    RETRY_DELAY: 5000,
    PORT: process.env.PORT || 3000,
    BOT_VERSION: process.env.BOT_VERSION || "2.1.0" // Use .env for bot version
};

// Ensure auth directory exists
async function ensureAuthFolder() {
    try {
        await fs.mkdir(config.AUTH_FOLDER, { recursive: true });
        logger.info("📁 Auth folder ensured.");
    } catch (err) {
        logger.error("❌ Failed to create auth folder:", err);
        process.exit(1);
    }
}

// Logger setup
const logger = pino({
    level: process.env.LOG_LEVEL || "debug", // Use LOG_LEVEL from .env
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    },
});

// Session management
async function initializeSession() {
    logger.info("🔑 Initializing WhatsApp session...");
    if (!process.env.WHATSAPP_SESSION) {
        logger.error("❌ WHATSAPP_SESSION environment variable not set. Please provide it.");
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
        logger.error("❌ Session initialization failed. Check WHATSAPP_SESSION format:", err);
        throw err;
    }
}

// WhatsApp Bot Class
class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.retryCount = 0;
        this.afkUsers = new Map();
        this.app = express();
    }

    async start() {
        logger.info("🚀 Starting Ernest Tech House Bot...");
        try {
            await ensureAuthFolder();
            await initializeSession();

            this.setupExpressServer();
            await this.connectWhatsApp();

        } catch (err) {
            logger.error("💥 Bot startup failed:", err);
            await this.handleRetry();
        }
    }

    setupExpressServer() {
        logger.info(`🌐 Initializing health check server on port ${config.PORT}...`);
        this.app.get("/health", (req, res) => {
            res.status(200).json({
                status: "running",
                connected: !!this.sock // Boolean check for connection status
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
            markOnlineOnConnect: process.env.ALWAYS_ONLINE === 'true' // Use .env variable
        });

        // Setup event handlers
        this.setupEventHandlers(saveCreds);
        // Pass the full sock instance to messageHandler
        messageHandler(this.sock, this.afkUsers);
        initScheduler(this.sock);

        logger.info("✅ WhatsApp connection initialized. Awaiting 'open' status...");
    }

    setupEventHandlers(saveCreds) {
        logger.info("⚙️ Setting up WhatsApp event handlers...");
        this.sock.ev.on("connection.update", async (update) => {
            // logger.debug("Connection update:", update); // Keep this for detailed connection debugging

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
            logger.error("Session logged out. ⚠️ Please generate a new WHATSAPP_SESSION.");
            return; // Do not retry if explicitly logged out
        }

        await this.handleRetry();
    }

    async handleSuccessfulConnection() {
        this.retryCount = 0;
        const user = this.sock.user;
        logger.info(`✅ Bot connected as ${user?.id?.split(':')[0] || "unknown"}!`);

        try {
            await this.sendConnectionNotification(user.id);
        } catch (err) {
            logger.error("❌ Failed to send connection notification:", err);
        }
    }

    async sendConnectionNotification(userId) {
        // --- Feature Status Checks (NEW) ---
        const getStatusEmoji = (envVar) => process.env[envVar] === 'true' ? '✅' : '❌';
        const ownerJid = process.env.OWNER_NUMBER ? jidNormalizedUser(process.env.OWNER_NUMBER.trim()) : 'Not Set';
        const botName = process.env.BOT_NAME || 'ErnestBot';

        const autoReadStatus = getStatusEmoji('AUTO_READ_MESSAGES');
        const antiDeleteStatus = getStatusEmoji('ANTI_DELETE_ENABLED');
        const autoViewStatusStatus = getStatusEmoji('AUTO_VIEW_STATUS_ENABLED');
        const sendStatusNotifStatus = getStatusEmoji('SEND_STATUS_VIEW_NOTIFICATION_ENABLED'); // New
        const autoViewChannelsStatus = getStatusEmoji('AUTO_VIEW_CHANNELS_ENABLED');
        const autoTypingStatus = getStatusEmoji('AUTO_TYPING_INDICATOR_ENABLED');
        const specialAlertsStatus = (process.env.SPECIAL_CONTACT_ALERTS && process.env.SPECIAL_CONTACT_ALERTS.length > 0) ? '✅' : '❌';
        const alwaysOnlineStatus = getStatusEmoji('ALWAYS_ONLINE');
        const botSignatureStatus = getStatusEmoji('BOT_SIGNATURE_ENABLED');
        const removeBgStatus = process.env.REMOVEBG_API_KEY && process.env.REMOVEBG_API_KEY !== 'YOUR_API_KEY' && process.env.REMOVEBG_API_KEY !== '' ? '✅' : '❌';
        const pythonApiStatus = process.env.PYTHON_API_URL && process.env.PYTHON_API_URL !== 'http://localhost:5000' && process.env.PYTHON_API_URL !== '' ? '✅' : '❌';
        const weatherApiStatus = process.env.WEATHER_API_KEY && process.env.WEATHER_API_KEY !== 'YOUR_WEATHER_API_KEY' && process.env.WEATHER_API_KEY !== '' ? '✅' : '❌'; // New

        // Count commands for dynamic display
        let commandCount = 'N/A';
        try {
            const files = await readdir(join(__dirname, 'commands'));
            commandCount = files.filter(file => file.endsWith('.js')).length;
        } catch (e) {
            console.error("Error counting commands:", e);
        }
        // --- END Feature Status Checks ---

        const message = `
╔═══════════════════════════════════════════╗
║         *${botName.toUpperCase()} - SYSTEM ONLINE* ║
╠═══════════════════════════════════════════╣
║ 👑 Owner: ${(ownerJid.split('@')[0] || 'Not Set').padEnd(25)} ║
║ 🤖 Version: ${config.BOT_VERSION.padEnd(25)} ║
║ ⚡ Commands Loaded: ${String(commandCount).padEnd(16)} ║
╠═══════════════════════════════════════════╣
║           *FEATURE STATUS* ║
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
╚═══════════════════════════════════════════╝
            `.trim();

        await this.sock.sendMessage(userId, { text: message });
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