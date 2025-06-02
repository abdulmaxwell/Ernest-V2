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
import { messageHandler, loadCommands } from "./handlers/messageHandler.js";
import express from "express";
import { initScheduler } from './lib/scheduler.js';

// Configure environment
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple Configuration
const config = {
  AUTH_FOLDER: join(__dirname, "data", "auth_state"),
  LOG_FILE: join(__dirname, "bot.log"),
  MAX_RETRIES: 3,
  RETRY_DELAY: 30000,
  PORT: process.env.PORT || 3000,
  BOT_VERSION: "2.1.0",
};

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

async function ensureAuthFolder() {
  try {
    await fs.mkdir(config.AUTH_FOLDER, { recursive: true });
  } catch (err) {
    console.error("Failed to create auth folder:", err);
    process.exit(1);
  }
}

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

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.retryCount = 0;
    this.afkUsers = new Map();
    this.app = express();
    this.commandsLoaded = false;
  }

  async start() {
    try {
      await ensureAuthFolder();
      await initializeSession();

      // Load commands first
      await loadCommands();
      this.commandsLoaded = true;

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
        commandsLoaded: this.commandsLoaded,
        uptime: process.uptime()
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
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 2000,
    });

    this.setupEventHandlers(saveCreds);
    this.setupMessageHandler();

    // Initialize scheduler after connection
    setTimeout(() => {
      initScheduler(this.sock);
    }, 5000);

    logger.info("WhatsApp connection initialized");
  }

  setupMessageHandler() {
    if (!this.commandsLoaded) {
      logger.error("Commands not loaded before message handler setup");
      return;
    }

    // Simple message handler without rate limiting
    messageHandler(this.sock, this.afkUsers, {
      TYPING: process.env.TYPING === 'true',
      AUDIO: process.env.AUDIO === 'true'
    });

    logger.info("Message handler setup complete");
  }

  setupEventHandlers(saveCreds) {
    this.sock.ev.on("connection.update", async (update) => {
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

    // Send simple connection notification to owner
    if (process.env.OWNER_NUMBER) {
      try {
        const ownerJid = process.env.OWNER_NUMBER.includes('@') 
          ? process.env.OWNER_NUMBER 
          : `${process.env.OWNER_NUMBER}@s.whatsapp.net`;
          
        const message = `🤖 Bot Connected Successfully!\n\nVersion: ${config.BOT_VERSION}\nCommands Loaded: ${Object.keys(await import('./handlers/messageHandler.js')).length}\nStatus: Online`;
        
        await this.sock.sendMessage(ownerJid, { text: message });
        logger.info("Connection notification sent to owner");
      } catch (err) {
        logger.error("Failed to send connection notification:", err);
      }
    }
  }

  async handleRetry() {
    if (this.retryCount < config.MAX_RETRIES) {
      this.retryCount++;
      const retryDelay = config.RETRY_DELAY * this.retryCount;
      logger.info(`Retrying connection (${this.retryCount}/${config.MAX_RETRIES}) in ${retryDelay / 1000}s...`);
      setTimeout(() => this.start(), retryDelay);
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

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  logger.info("Graceful shutdown initiated...");
  await bot.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Graceful shutdown initiated...");
  await bot.cleanup();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

const bot = new WhatsAppBot();
bot.start().catch(err => {
  logger.error("Fatal error:", err);
  process.exit(1);
});