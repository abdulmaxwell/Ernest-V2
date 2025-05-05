import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { messageHandler } from './handlers/messageHandler.js';

// Configure environment
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const AUTH_FOLDER = join(__dirname, 'data', 'auth_state');
const LOG_FILE = join(__dirname, 'bot.log');
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

// Ensure auth directory exists
if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

// Logger setup
const logger = pino({
    level: 'debug',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    },
    destination: pino.destination(LOG_FILE)
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
            logger.info('🧹 Cleaning up previous connection...');
            await sock.end();
            sock.ev.removeAllListeners();
            sock = null;
        } catch (e) {
            logger.error('Error during cleanup:', e);
        }
    }
};

// Load session from .env
const loadSessionFromEnv = () => {
    if (!process.env.WHATSAPP_SESSION) {
        throw new Error('WHATSAPP_SESSION environment variable not set');
    }

    try {
        const decoded = Buffer.from(process.env.WHATSAPP_SESSION, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch (e) {
        throw new Error('Failed to parse session from environment: ' + e.message);
    }
};

const startBot = async () => {
    if (isShuttingDown) return;

    try {
        await cleanup();
        logger.info('🚀 Initializing WhatsApp Bot...');

        // Load session and write to creds.json
        const session = loadSessionFromEnv();
        if (!fs.existsSync(AUTH_FOLDER)) {
            fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }
        fs.writeFileSync(join(AUTH_FOLDER, 'creds.json'), JSON.stringify(session, null, 2));
        logger.info('✅ Session loaded from environment');

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

        sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Chrome'),
            markOnlineOnConnect: true,
            syncFullHistory: false,
            getMessage: async () => undefined,
            printQRInTerminal: false,
            shouldSyncHistoryMessage: () => false,
            shouldIgnoreJid: jid => jid.endsWith('@g.us')
        });

        // Attach message handler
        messageHandler(sock, afkUsers);

        // Auto-status viewer & AFK logic
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                if (!msg.message || msg.key.fromMe) continue;

                const senderId = msg.key.participant || msg.key.remoteJid;

                // Auto view statuses
                if (msg.message?.protocolMessage?.key?.remoteJid?.endsWith('status@broadcast')) {
                    try {
                        await sock.readMessages([msg.key]);
                        logger.info(`📢 Viewed status from: ${msg.key.remoteJid}`);
                    } catch (err) {
                        logger.error('Error viewing status:', err);
                    }
                    continue;
                }

                // AFK logic
                if (afkUsers.has(senderId)) {
                    const { reason, time } = afkUsers.get(senderId);
                    const seconds = Math.floor((Date.now() - time) / 1000);
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `🙅 This user is AFK: *${reason}* (${seconds}s ago)`
                    }, { quoted: msg });
                } else {
                    // Optional: clear AFK when user sends a message
                    if (!senderId.endsWith('status@broadcast')) {
                        afkUsers.delete(senderId);
                    }
                }
            }
        });

        // Reconnect logic
        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
                logger.warn(`⚠️ Connection closed (Code: ${code || 'unknown'})`);

                if (code === DisconnectReason.loggedOut) {
                    logger.error('❌ Session logged out. Please update WHATSAPP_SESSION in .env');
                    return;
                }

                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    logger.info(`🔄 Retrying connection (${retryCount}/${MAX_RETRIES})...`);
                    setTimeout(startBot, RETRY_DELAY);
                } else {
                    logger.error('💀 Max retries reached. Giving up.');
                }
            }

            if (connection === 'open') {
                retryCount = 0;
                const user = sock.user;
                logger.info(`✅ Connected as ${user?.id || 'unknown'}`);
                try {
                    await sock.sendMessage(user.id, { text: '🤖 *Bot Connected!* — ernestV1 is online via session auth.' });
                } catch (err) {
                    logger.error('❌ Could not send connected message:', err.message);
                }
            }
        });

        // Save credentials
        sock.ev.on('creds.update', saveCreds);

    } catch (err) {
        logger.error(`❌ Initialization error: ${err.message}`);
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            logger.info(`🔁 Retrying in ${RETRY_DELAY / 1000}s... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(startBot, RETRY_DELAY);
        } else {
            logger.error('💥 Max init retries reached.');
        }
    }
};

// Shutdown handling
const shutdown = async () => {
    isShuttingDown = true;
    logger.info('🛑 Shutting down gracefully...');
    await cleanup();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the bot
startBot();
