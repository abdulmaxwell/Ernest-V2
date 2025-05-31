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
import { error } from "console";

// Configure environment
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced Configuration with Anti-Detection Features
const config = {
  AUTH_FOLDER: join(__dirname, "data", "auth_state"),
  LOG_FILE: join(__dirname, "bot.log"),
  MAX_RETRIES: 3, // Reduced retries
  RETRY_DELAY: 30000, // Increased to 30 seconds
  PORT: process.env.PORT || 3000,
  BOT_VERSION: "2.1.0",
  
  // Anti-Detection Settings
  ANTI_DETECTION: {
    MIN_RESPONSE_DELAY: 2000,    // Minimum 2 seconds before responding
    MAX_RESPONSE_DELAY: 8000,    // Maximum 8 seconds before responding
    TYPING_DURATION: 3000,       // How long to show "typing" indicator
    READ_DELAY: 1000,            // Delay before marking as read
    DAILY_MESSAGE_LIMIT: 200,    // Max messages per day
    HOURLY_MESSAGE_LIMIT: 20,    // Max messages per hour
    COOLDOWN_BETWEEN_MESSAGES: 5000, // 5 seconds between messages
    RANDOM_OFFLINE_INTERVALS: true,  // Randomly go offline
    OFFLINE_MIN_DURATION: 300000,    // Min offline time (5 minutes)
    OFFLINE_MAX_DURATION: 1800000,   // Max offline time (30 minutes)
  },
  
  // Presence settings
  PRESENCE: {
    TYPING: process.env.TYPING === 'true',
    AUDIO: process.env.AUDIO === 'true',
    ALWAYS_ONLINE: false, // Changed to false for better stealth
    RANDOM_STATUS: true   // Randomly change online status
  }
};

// Message rate limiting
class RateLimiter {
  constructor() {
    this.messageCount = new Map();
    this.dailyCount = 0;
    this.hourlyCount = 0;
    this.lastHourReset = Date.now();
    this.lastDayReset = Date.now();
    this.lastMessageTime = 0;
  }

  canSendMessage() {
    const now = Date.now();
    
    // Reset counters
    if (now - this.lastHourReset > 3600000) { // 1 hour
      this.hourlyCount = 0;
      this.lastHourReset = now;
    }
    
    if (now - this.lastDayReset > 86400000) { // 24 hours
      this.dailyCount = 0;
      this.lastDayReset = now;
    }
    
    // Check limits
    if (this.dailyCount >= config.ANTI_DETECTION.DAILY_MESSAGE_LIMIT) {
      return false;
    }
    
    if (this.hourlyCount >= config.ANTI_DETECTION.HOURLY_MESSAGE_LIMIT) {
      return false;
    }
    
    // Check cooldown
    if (now - this.lastMessageTime < config.ANTI_DETECTION.COOLDOWN_BETWEEN_MESSAGES) {
      return false;
    }
    
    return true;
  }
  
  recordMessage() {
    this.dailyCount++;
    this.hourlyCount++;
    this.lastMessageTime = Date.now();
  }
}

// Human-like delay utility
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

// Logger setup with reduced verbosity
const logger = pino({
  level: "debug", // Changed from debug to info
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

// Enhanced WhatsApp Bot Class with Anti-Detection
class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.retryCount = 0;
    this.afkUsers = new Map();
    this.app = express();
    this.presenceSettings = config.PRESENCE;
    this.rateLimiter = new RateLimiter();
    this.isOnline = true;
    this.messageQueue = [];
    this.processingQueue = false;
    this.randomOfflineTimer = null;
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
        presence: this.presenceSettings,
        dailyMessages: this.rateLimiter.dailyCount,
        hourlyMessages: this.rateLimiter.hourlyCount
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
      logger: pino({ level: "silent" }), // Completely silent
      browser: Browsers.macOS("Desktop"),
      printQRInTerminal: false,
      shouldSyncHistoryMessage: () => false,
      syncFullHistory: false,
      markOnlineOnConnect: false, // Don't immediately mark as online
      connectTimeoutMs: 60000,    // Longer connection timeout
      defaultQueryTimeoutMs: 60000, // Longer query timeout
      keepAliveIntervalMs: 30000,   // Less frequent keep-alive
      retryRequestDelayMs: 2000,    // Longer retry delay
    });

    // Setup event handlers
    this.setupEventHandlers(saveCreds);
    this.setupEnhancedMessageHandler();
    
    // Initialize scheduler with delays
    setTimeout(() => {
      initScheduler(this.sock);
    }, 5000);

    // Start random offline intervals
    if (config.ANTI_DETECTION.RANDOM_OFFLINE_INTERVALS) {
      this.startRandomOfflineIntervals();
    }

    logger.info("WhatsApp connection initialized with anti-detection features");
  }

  setupEnhancedMessageHandler() {
    // Enhanced message handler with human-like behavior
    messageHandler(this.sock, this.afkUsers, this.presenceSettings, {
      beforeResponse: async (messageInfo) => {
        // Check rate limits
        if (!this.rateLimiter.canSendMessage()) {
          logger.warn("Rate limit reached, skipping message");
          return false;
        }

        // Add to queue for sequential processing
        this.messageQueue.push(messageInfo);
        this.processMessageQueue();
        return false; // Let queue handle it
      }
    });
  }

  async processMessageQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) return;
    
    this.processingQueue = true;
    
    while (this.messageQueue.length > 0) {
      const messageInfo = this.messageQueue.shift();
      await this.processMessageWithDelay(messageInfo);
    }
    
    this.processingQueue = false;
  }

  async processMessageWithDelay(messageInfo) {
    try {
      // Random delay before reading
      await sleep(getRandomDelay(500, 2000));
      
      // Mark as read (if not disabled)
      if (messageInfo.key && this.sock) {
        await this.sock.readMessages([messageInfo.key]);
      }
      
      // Show typing indicator
      if (this.presenceSettings.TYPING && messageInfo.from) {
        await this.sock.sendPresenceUpdate('composing', messageInfo.from);
      }
      
      // Random typing duration
      const typingDuration = getRandomDelay(
        config.ANTI_DETECTION.MIN_RESPONSE_DELAY,
        config.ANTI_DETECTION.MAX_RESPONSE_DELAY
      );
      
      await sleep(typingDuration);
      
      // Stop typing
      if (this.presenceSettings.TYPING && messageInfo.from) {
        await this.sock.sendPresenceUpdate('paused', messageInfo.from);
      }
      
      // Small delay before sending
      await sleep(getRandomDelay(500, 1500));
      
      // Process the actual message (you'll need to integrate this with your message handler)
      // This is where your actual message processing logic should go
      
      // Record the message
      this.rateLimiter.recordMessage();
      
      // Random delay between messages
      await sleep(config.ANTI_DETECTION.COOLDOWN_BETWEEN_MESSAGES);
      
    } catch (err) {
      logger.error("Error processing message:", err);
    }
  }

  startRandomOfflineIntervals() {
    const scheduleNextOffline = () => {
      // Random interval between 30 minutes to 2 hours
      const nextOfflineIn = getRandomDelay(1800000, 7200000);
      
      this.randomOfflineTimer = setTimeout(async () => {
        await this.goOfflineTemporarily();
        scheduleNextOffline();
      }, nextOfflineIn);
    };
    
    scheduleNextOffline();
  }

  async goOfflineTemporarily() {
    if (!this.sock) return;
    
    try {
      logger.info("Going offline temporarily for stealth");
      
      // Set presence to offline
      await this.sock.sendPresenceUpdate('unavailable');
      this.isOnline = false;
      
      // Stay offline for random duration
      const offlineDuration = getRandomDelay(
        config.ANTI_DETECTION.OFFLINE_MIN_DURATION,
        config.ANTI_DETECTION.OFFLINE_MAX_DURATION
      );
      
      setTimeout(async () => {
        if (this.sock) {
          await this.sock.sendPresenceUpdate('available');
          this.isOnline = true;
          logger.info("Back online");
        }
      }, offlineDuration);
      
    } catch (err) {
      logger.error("Error during offline period:", err);
    }
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
    
    // Handle presence updates more naturally
    this.sock.ev.on("presence.update", (update) => {
      // Don't log presence updates to reduce noise
    });
  }

  async handleDisconnection(lastDisconnect) {
    const code = lastDisconnect?.error?.output?.statusCode || 
                lastDisconnect?.error?.output?.payload?.statusCode;
    
    logger.warn(`Connection closed (Code: ${code || "unknown"})`);

    if (code === DisconnectReason.loggedOut) {
      logger.error("Session logged out. Please update WHATSAPP_SESSION.");
      return;
    }

    // Clear offline timer
    if (this.randomOfflineTimer) {
      clearTimeout(this.randomOfflineTimer);
    }

    await this.handleRetry();
  }

  async handleSuccessfulConnection() {
    this.retryCount = 0;
    const user = this.sock.user;
    logger.info(`✅ Connected as ${user?.id || "unknown"}`);

    // Delay before sending connection notification
    setTimeout(async () => {
      try {
        await this.sendConnectionNotification(user.id);
      } catch (err) {
        logger.error("Failed to send connection notification:", err);
      }
    }, getRandomDelay(5000, 15000)); // Random delay 5-15 seconds
  }

  async sendConnectionNotification(userId) {
    const statusEmoji = (status) => status ? '✅' : '❌';
    
    const message = `
╔══════════════════════════════╗
║    *ERNEST TECH HOUSE BOT*   ║
╠══════════════════════════════╣
║ Status: Connected (Stealth)  ║
║ Version: ${config.BOT_VERSION.padEnd(15)}║
║                              ║
║ Anti-Detection: ✅           ║
║ Rate Limited: ✅             ║
║ Human-like: ✅               ║
║                              ║
║ Enhanced with stealth features║
║ Reduced detection risk       ║
║                              ║
║ Contact: +254793859108       ║
╚══════════════════════════════╝
    `.trim();

    // Show typing before sending
    await this.sock.sendPresenceUpdate('composing', userId);
    await sleep(3000);
    
    await this.sock.sendMessage(userId, { text: message });
    
    // Mark this message in rate limiter
    this.rateLimiter.recordMessage();
  }

  async handleRetry() {
    if (this.retryCount < config.MAX_RETRIES) {
      this.retryCount++;
      const retryDelay = config.RETRY_DELAY * (this.retryCount * 2); // Exponential backoff
      logger.info(`Retrying connection (${this.retryCount}/${config.MAX_RETRIES}) in ${retryDelay/1000}s...`);
      setTimeout(() => this.start(), retryDelay);
    } else {
      logger.error("Max retries reached. Shutting down.");
      process.exit(1);
    }
  }

  async cleanup() {
    if (this.randomOfflineTimer) {
      clearTimeout(this.randomOfflineTimer);
    }
    
    if (this.sock) {
      try {
        await this.sock.sendPresenceUpdate('unavailable');
        await sleep(1000);
        await this.sock.end();
        this.sock.ev.removeAllListeners();
      } catch (err) {
        logger.error("Cleanup error:", err);
      }
    }
  }
}

// Process handlers with graceful shutdown
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

// Error handling
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection:', err.stack || err);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err.stack ||  err);
  console.log(err);
  //process.exit(1);
});

// Start the bot
const bot = new WhatsAppBot();
bot.start().catch(err => {
  logger.error("Fatal error:", err.stack || err);
  process.exit(1);
});