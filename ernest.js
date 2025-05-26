import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs/promises";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { messageHandler } from "./handlers/messageHandler.js";
import express from "express";
import { initScheduler } from './lib/scheduler.js';

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
  BOT_VERSION: "2.1.0",
  // Presence settings
  PRESENCE: {
    TYPING: process.env.TYPING === 'true',
    AUDIO: process.env.AUDIO === 'true',
    ALWAYS_ONLINE: process.env.ALWAYS_ONLINE === 'true'
  }
};

// Validate presence settings - only one can be true
if (config.PRESENCE.TYPING && config.PRESENCE.AUDIO) {
  config.PRESENCE.AUDIO = false; // Default to typing if both are true
  console.warn("Both TYPING and AUDIO cannot be true simultaneously. Defaulting to TYPING.");
}

// Ensure auth directory exists
async function ensureAuthFolder() {
  try {
    await fs.mkdir(config.AUTH_FOLDER, { recursive: true });
  } catch (err) {
    console.error("Failed to create auth folder:", err);
    process.exit(1);
  }
}

// Logger setup
const logger = pino({
  level: "debug",
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
  if (!process.env.WHATSAPP_SESSION) {
    throw new Error("WHATSAPP_SESSION environment variable not set");
  }

  try {
    const decoded = Buffer.from(process.env.WHATSAPP_SESSION, "base64").toString("utf-8");
    const session = JSON.parse(decoded);
    const credsPath = join(config.AUTH_FOLDER, "creds.json");
    
    await fs.writeFile(credsPath, JSON.stringify(session, null, 2));
    logger.info("Session initialized from environment variable");
    
    return true;
  } catch (err) {
    logger.error("Session initialization failed:", err);
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
    this.presenceSettings = config.PRESENCE;
  }

  async start() {
    try {
      await ensureAuthFolder();
      await initializeSession();
      
      this.setupExpressServer();
      await this.connectWhatsApp();
      
    } catch (err) {
      logger.error("Bot startup failed:", err);
      await this.handleRetry();
    }
  }

  setupExpressServer() {
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "running",
        connected: !!this.sock,
        presence: this.presenceSettings
      });
    });

    this.app.listen(config.PORT, () => {
      logger.info(`🌐 Health server running on port ${config.PORT}`);
    });
  }

  async connectWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(config.AUTH_FOLDER);
    
    this.sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Desktop"),
      printQRInTerminal: false,
      shouldSyncHistoryMessage: () => false,
      syncFullHistory: false,
      markOnlineOnConnect: this.presenceSettings.ALWAYS_ONLINE
    });

    // Setup event handlers
    this.setupEventHandlers(saveCreds);
    messageHandler(this.sock, this.afkUsers, this.presenceSettings);
    initScheduler(this.sock);

    logger.info("WhatsApp connection initialized");
  }

  setupEventHandlers(saveCreds) {
    this.sock.ev.on("connection.update", async (update) => {
      logger.debug("Connection update:", update);
      
      if (update.connection === "close") {
        await this.handleDisconnection(update.lastDisconnect);
      }

      if (update.connection === "open") {
        await this.handleSuccessfulConnection();
      }
    });

    this.sock.ev.on("creds.update", saveCreds);
  }

  async handleDisconnection(lastDisconnect) {
    const code = lastDisconnect?.error?.output?.statusCode || 
                lastDisconnect?.error?.output?.payload?.statusCode;
    
    logger.warn(`Connection closed (Code: ${code || "unknown"})`);

    if (code === DisconnectReason.loggedOut) {
      logger.error("Session logged out. Please update WHATSAPP_SESSION.");
      return;
    }

    await this.handleRetry();
  }

  async handleSuccessfulConnection() {
    this.retryCount = 0;
    const user = this.sock.user;
    logger.info(`✅ Connected as ${user?.id || "unknown"}`);

    try {
      await this.sendConnectionNotification(user.id);
    } catch (err) {
      logger.error("Failed to send connection notification:", err);
    }
  }

  async sendConnectionNotification(userId) {
    const statusEmoji = (status) => status ? '✅' : '❌';
    
    const message = `
╔══════════════════════════════╗
║    *ERNEST TECH HOUSE BOT*   ║
╠══════════════════════════════╣
║ Status: Connected            ║
║ Version: ${config.BOT_VERSION.padEnd(15)}║
║                              ║
║ Always Online: ${statusEmoji(this.presenceSettings.ALWAYS_ONLINE)}           ║
║ Typing: ${statusEmoji(this.presenceSettings.TYPING)}                 ║
║ Audio: ${statusEmoji(this.presenceSettings.AUDIO)}                  ║
║                              ║
║ Authenticated via session ID ║
║ No QR code required          ║
╚══════════════════════════════╝
    `.trim();

    await this.sock.sendMessage(userId, { text: message });
  }

  async handleRetry() {
    if (this.retryCount < config.MAX_RETRIES) {
      this.retryCount++;
      logger.info(`Retrying connection (${this.retryCount}/${config.MAX_RETRIES})...`);
      setTimeout(() => this.start(), config.RETRY_DELAY);
    } else {
      logger.error("Max retries reached. Shutting down.");
      process.exit(1);
    }
  }

  async cleanup() {
    if (this.sock) {
      try {
        await this.sock.end();
        this.sock.ev.removeAllListeners();
      } catch (err) {
        logger.error("Cleanup error:", err);
      }
    }
  }
}

// Process handlers
process.on("SIGINT", async () => {
  await bot.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await bot.cleanup();
  process.exit(0);
});

// Start the bot
const bot = new WhatsAppBot();
bot.start().catch(err => {
  logger.error("Fatal error:", err);
  process.exit(1);
});