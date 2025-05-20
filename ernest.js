import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { messageHandler } from "./handlers/messageHandler.js";
import express from "express";

// Configure environment
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const AUTH_FOLDER = join(__dirname, "data", "auth_state");
const LOG_FILE = join(__dirname, "bot.log");
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

// Ensure auth directory exists
if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true });
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
  destination: pino.destination(LOG_FILE),
});

// State
let retryCount = 0;
let sock = null;
let isShuttingDown = false;

// In-memory AFK map
const afkUsers = new Map();

// Cleanup function
const cleanup = async () => {
  if (sock) {
    try {
      logger.info("🧹 Cleaning up previous connection...");
      await sock.end();
      sock.ev.removeAllListeners();
      sock = null;
    } catch (e) {
      logger.error("Error during cleanup:", e);
    }
  }
};

// Load session from .env
const loadSessionFromEnv = () => {
  if (!process.env.WHATSAPP_SESSION) {
    throw new Error("WHATSAPP_SESSION environment variable not set");
  }

  try {
    const decoded = Buffer.from(
      process.env.WHATSAPP_SESSION,
      "base64"
    ).toString("utf-8");
    return JSON.parse(decoded);
  } catch (e) {
    throw new Error("Failed to parse session from environment: " + e.message);
  }
};

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    bot: sock ? "connected" : "disconnected",
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`🌐 Server running on port ${PORT}`);
});

const startBot = async () => {
  if (isShuttingDown) return;

  try {
    await cleanup();
    logger.info("🚀 Initializing WhatsApp Bot...");

    // Load session and write to creds.json
    const credsPath = join(AUTH_FOLDER, "creds.json");
    if (!fs.existsSync(credsPath)) {
      const session = loadSessionFromEnv();
      fs.writeFileSync(credsPath, JSON.stringify(session, null, 2));
      logger.info("✅ Session loaded from environment and saved to creds.json");
    } else {
      logger.info("✅ Using existing session from creds.json");
    }


    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Chrome"),
      markOnlineOnConnect: true,
      syncFullHistory: false,
      getMessage: async () => undefined,
      printQRInTerminal: false,
      shouldSyncHistoryMessage: () => false,
    });

    // Attach message handler
    messageHandler(sock, afkUsers);

    // Auto-status viewer & AFK logic
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      // if (!msg.message || msg.key.fromMe) return;
      if (!msg.message) return;

      const from = msg.key.remoteJid;
      const body =
        msg.message?.conversation || msg.message?.extendedTextMessage?.text;

      // Handle Math Quiz
      if (global.mathQuiz && global.mathQuiz[from]) {
        const correctAnswer = global.mathQuiz[from].answer;
        const userAnswer = parseFloat(body.replace(/[^0-9.\-]/g, ""));
        if (userAnswer === correctAnswer) {
          clearTimeout(global.mathQuiz[from].timeout);
          delete global.mathQuiz[from];
          await sock.sendMessage(
            from,
            { text: `✅ Correct! 🎉 You earned bonus points!` },
            { quoted: msg }
          );
        } else {
          await sock.sendMessage(
            from,
            { text: `❌ Nope! Try again...` },
            { quoted: msg }
          );
        }
      }

      // AFK Handling
      const senderId = msg.key.participant || msg.key.remoteJid;
      const chatId = msg.key.remoteJid;

      if (afkUsers.has(senderId)) {
        afkUsers.delete(senderId);
        await sock.sendMessage(chatId, {
          text: `✅ Welcome back! You've been removed from AFK.`,
          quoted: msg,
        });
      }

      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      for (let jid of mentioned) {
        if (afkUsers.has(jid)) {
          const { reason, time } = afkUsers.get(jid);
          const duration = formatDuration(Date.now() - time);
          await sock.sendMessage(chatId, {
            text: `💤 That user is currently AFK\n⏱️ Since: ${duration} ago\n📝 Reason: ${reason}`,
            quoted: msg,
          });
        }
      }

      function formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
      }
    });

    // Connection update
    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "close") {
        const code =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.output?.payload?.statusCode;
        logger.warn(`⚠️ Connection closed (Code: ${code || "unknown"})`);

        if (code === DisconnectReason.loggedOut) {
          logger.error(
            "❌ Session logged out. Please update WHATSAPP_SESSION in .env"
          );
          return;
        }

        if (retryCount < MAX_RETRIES) {
          retryCount++;
          logger.info(`🔄 Retrying connection (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(startBot, RETRY_DELAY);
        } else {
          logger.error("💀 Max retries reached. Giving up.");
        }
      }

      if (connection === "open") {
        retryCount = 0;
        const user = sock.user;
        logger.info(`✅ Connected as ${user?.id || "unknown"}`);
        try {
          await sock.sendMessage(user.id, {
            text: `╔══════════════════════╗\n║   BOT CONNECTED 🌟   ║\n╠══════════════════════╣\n║ ernestV1 is now      ║\n║ online and ready to  ║\n║ serve!               ║\n║                      ║\n║ Version: 2.0         ║\n║ Mode: Pease Ernest Appriciates that you have chosen the bot thanks    ║\n╚══════════════════════╝`,
          });
        } catch (err) {
          logger.error("❌ Could not send connected message:", err.message);
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);
  } catch (err) {
    logger.error(`❌ Initialization error: ${err.message}`);
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      logger.info(
        `🔁 Retrying in ${RETRY_DELAY / 1000}s... (${retryCount}/${MAX_RETRIES})`
      );
      setTimeout(startBot, RETRY_DELAY);
    } else {
      logger.error("💥 Max init retries reached.");
    }
  }
};

// Shutdown handling
const shutdown = async () => {
  isShuttingDown = true;
  logger.info("🛑 Shutting down gracefully...");
  await cleanup();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Kick things off
startBot();
