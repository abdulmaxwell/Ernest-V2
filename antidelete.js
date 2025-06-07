// =================================================================
// ENHANCED ANTI-DELETE SYSTEM WITH ADVANCED LOGGING
// =================================================================
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';
import { pino } from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() })
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname'
    }
  }
});

// Configuration
const DEFAULT_STORAGE_PATH = path.join(__dirname, '../data/anti-delete/messages.json');
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MESSAGE_RETENTION_TIME = 30 * 60 * 1000; // 30 minutes
const MAX_STORAGE_SIZE = 10000; // Max messages to store
const STORAGE_LOCK_TIMEOUT = 5000; // 5 seconds lock timeout

class MessageStorage {
  constructor(storagePath = DEFAULT_STORAGE_PATH) {
    this.storagePath = storagePath;
    this.messages = new Map();
    this.cleanupTimer = null;
    this.isInitialized = false;
    this.storageLock = false;
    this.lockTimeout = null;
  }

  async initialize() {
    if (this.isInitialized) {
      logger.debug('Storage already initialized');
      return;
    }
    
    try {
      // Ensure storage directory exists
      const dataDir = path.dirname(this.storagePath);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Load existing messages
      await this.loadMessages();
      
      // Start cleanup timer
      this.startCleanupTimer();
      
      this.isInitialized = true;
      logger.info({ 
        status: 'initialized',
        path: this.storagePath,
        messageCount: this.messages.size
      }, 'Message storage initialized');
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack
      }, 'Failed to initialize message storage');
      throw error;
    }
  }

  async acquireLock() {
    const startTime = Date.now();
    while (this.storageLock) {
      if (Date.now() - startTime > STORAGE_LOCK_TIMEOUT) {
        throw new Error('Storage lock timeout exceeded');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.storageLock = true;
    this.lockTimeout = setTimeout(() => {
      this.storageLock = false;
      logger.warn('Storage lock timeout released');
    }, STORAGE_LOCK_TIMEOUT);
  }

  releaseLock() {
    clearTimeout(this.lockTimeout);
    this.storageLock = false;
  }

  async loadMessages() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf8');
      const parsed = JSON.parse(data);
      
      const now = Date.now();
      let loadedCount = 0;
      
      for (const [id, msgData] of Object.entries(parsed)) {
        if (now - msgData.timestamp < MESSAGE_RETENTION_TIME) {
          this.messages.set(id, msgData);
          loadedCount++;
        }
      }
      
      logger.info({
        loaded: loadedCount,
        expired: Object.keys(parsed).length - loadedCount,
        path: this.storagePath
      }, 'Messages loaded from storage');
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.debug('No existing storage file found, starting fresh');
      } else {
        logger.error({
          error: error.message,
          stack: error.stack
        }, 'Error loading messages');
      }
    }
  }

  async saveMessages() {
    await this.acquireLock();
    try {
      const obj = Object.fromEntries(this.messages);
      const tempPath = `${this.storagePath}.tmp`;
      
      await fs.writeFile(tempPath, JSON.stringify(obj, null, 2));
      await fs.rename(tempPath, this.storagePath);
      
      logger.debug({
        count: this.messages.size,
        size: `${(Buffer.byteLength(JSON.stringify(obj)) )/ 1024} KB`
      }, 'Messages saved to storage');
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack
      }, 'Error saving messages');
      throw error;
    } finally {
      this.releaseLock();
    }
  }

  async storeMessage(messageId, messageData, chatId) {
    if (this.messages.size >= MAX_STORAGE_SIZE) {
      logger.warn({
        limit: MAX_STORAGE_SIZE,
        current: this.messages.size
      }, 'Storage limit reached, skipping message');
      return;
    }

    const storageData = {
      id: messageId,
      message: messageData,
      chatId: chatId,
      timestamp: Date.now(),
      sender: messageData.key?.participant || messageData.key?.remoteJid,
      messageType: Object.keys(messageData.message || {})[0] || 'unknown'
    };
    
    try {
      await this.acquireLock();
      this.messages.set(messageId, storageData);
      await this.saveMessages();
      
      logger.debug({
        messageId,
        chatId,
        type: storageData.messageType,
        sender: storageData.sender
      }, 'Message stored');
    } catch (error) {
      logger.error({
        error: error.message,
        messageId,
        chatId
      }, 'Failed to store message');
    } finally {
      this.releaseLock();
    }
  }

  getMessage(messageId) {
    return this.messages.get(messageId);
  }

  async cleanup() {
    const now = Date.now();
    const initialSize = this.messages.size;
    
    try {
      await this.acquireLock();
      for (const [id, data] of this.messages.entries()) {
        if (now - data.timestamp > MESSAGE_RETENTION_TIME) {
          this.messages.delete(id);
        }
      }
      
      const deletedCount = initialSize - this.messages.size;
      if (deletedCount > 0) {
        await this.saveMessages();
        logger.info({
          cleaned: deletedCount,
          remaining: this.messages.size
        }, 'Expired messages cleaned up');
      }
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack
      }, 'Cleanup failed');
    } finally {
      this.releaseLock();
    }
  }

  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error(error, 'Cleanup timer error');
      });
    }, CLEANUP_INTERVAL);
    
    logger.debug(`Cleanup timer started (every ${CLEANUP_INTERVAL / 60000} minutes)`);
  }

  async destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    await this.saveMessages();
    logger.info('Message storage destroyed');
  }
}

// Global message storage instance
const messageStorage = new MessageStorage(process.env.ANTI_DELETE_STORAGE_PATH);

// =================================================================
// ANTI-DELETE MESSAGE HANDLER
// =================================================================

export async function handleAntiDelete(sock, msg) {
  // Skip if message is invalid
  if (!msg?.key?.id || !msg?.key?.remoteJid || !msg.message) {
    logger.debug({
      reason: 'invalid_message_structure',
      hasId: !!msg?.key?.id,
      hasRemoteJid: !!msg?.key?.remoteJid,
      hasMessage: !!msg.message
    }, 'Skipping invalid message');
    return false;
  }

  const messageId = msg.key.id;
  const chatId = msg.key.remoteJid;
  const messageType = Object.keys(msg.message || {})[0] || 'unknown';

  try {
    // Initialize storage if not done yet
    if (!messageStorage.isInitialized) {
      logger.debug('Initializing message storage');
      await messageStorage.initialize();
    }

    // Handle protocol messages (like deletions)
    if (msg.message.protocolMessage) {
      logger.debug({
        messageId,
        protocolType: msg.message.protocolMessage?.type
      }, 'Processing protocol message');

      if (msg.message.protocolMessage?.type === 'REVOKE') {
        await handleMessageDeletion(sock, msg);
      }
      return false;
    }

    // Skip our own messages
    if (msg.key.fromMe) {
      logger.debug({ messageId }, 'Skipping self-originated message');
      return false;
    }

    // Store the message
    await messageStorage.storeMessage(messageId, msg, chatId);
    
    logger.info({
      messageId,
      chatId,
      type: messageType,
      sender: msg.key.participant || msg.key.remoteJid
    }, 'Message processed');

    return false;
  } catch (error) {
    logger.error({
      error: error.message,
      stack: error.stack,
      messageId,
      chatId,
      messageType
    }, 'Anti-delete handler error');
    return false;
  }
}

async function handleMessageDeletion(sock, msg) {
  const antiDeleteEnabled = process.env.ANTI_DELETE_ENABLED === 'true' || 
                          process.env.ANTI_DELETE_ENABLED === '1';
  
  if (!antiDeleteEnabled) {
    logger.debug('Anti-delete feature is disabled, skipping deletion handling');
    return;
  }

  const deletedMessageId = msg.message.protocolMessage.key.id;
  const chatId = msg.key.remoteJid;
  const botOwner = process.env.BOT_OWNER || process.env.OWNER_NUMBER;

  if (!botOwner) {
    logger.error('No bot owner configured, cannot notify about deletion');
    return;
  }

  logger.info({
    deletedMessageId,
    chatId,
    deleter: msg.key.participant || msg.key.remoteJid
  }, 'Processing message deletion');

  try {
    const originalMessage = messageStorage.getMessage(deletedMessageId);
    const ownerJid = `${botOwner}@s.whatsapp.net`;

    const deleteNotification = {
      text: `🗑️ *ANTI-DELETE ALERT*\n\n` +
            `📱 *Chat:* ${chatId}\n` +
            `🕒 *Deleted At:* ${new Date().toLocaleString()}\n` +
            `🆔 *Message ID:* ${deletedMessageId}\n` +
            `👤 *Sender:* ${originalMessage?.sender || 'Unknown'}\n` +
            `💬 *Type:* ${originalMessage?.messageType || 'Unknown'}\n\n` +
            (originalMessage ? '✅ *Original message recovered!*' : 
             '❌ *Could not retrieve original message*')
    };

    // Send initial notification
    await sock.sendMessage(ownerJid, deleteNotification);

    if (originalMessage) {
      try {
        const restoredMsg = generateWAMessageFromContent(
          ownerJid, 
          originalMessage.message.message, 
          { userJid: sock.user.id }
        );
        
        await sock.relayMessage(ownerJid, restoredMsg.message, {
          messageId: restoredMsg.key.id,
        });
        
        await sock.sendMessage(ownerJid, {
          text: `☝️ *Above is the deleted message*\n⏰ *Originally sent:* ${new Date(originalMessage.timestamp).toLocaleString()}`
        });

        logger.info({
          deletedMessageId,
          originalTimestamp: originalMessage.timestamp
        }, 'Successfully relayed deleted message');
      } catch (relayError) {
        logger.error({
          error: relayError.message,
          deletedMessageId,
          messageType: originalMessage?.messageType
        }, 'Failed to relay deleted message');

        await sock.sendMessage(ownerJid, {
          text: `❌ Could not relay the message, but here's the info:\n\n` +
                `📝 *Message Type:* ${originalMessage.messageType}\n` +
                `📄 *Content:* ${originalMessage.message.message.conversation || 'Media/Other content'}`
        });
      }
    }
  } catch (error) {
    logger.error({
      error: error.message,
      stack: error.stack,
      deletedMessageId,
      chatId
    }, 'Failed to handle message deletion');
  }
}

// =================================================================
// ANTI-DELETE COMMAND
// =================================================================

export default async function antidelete(sock, msg, from) {
  const commandStartTime = Date.now();
  const userNumber = (msg.key.participant || msg.key.remoteJid).replace('@s.whatsapp.net', '');
  const botOwner = process.env.BOT_OWNER || process.env.OWNER_NUMBER;

  // Verify owner
  if (userNumber !== botOwner) {
    logger.warn({
      unauthorizedUser: userNumber,
      command: 'antidelete'
    }, 'Unauthorized command attempt');
    
    await sock.sendMessage(from, { 
      text: '❌ This command is only available for the bot owner!' 
    });
    return;
  }

  const args = msg.body?.split(' ').slice(1) || [];
  const action = args[0]?.toLowerCase();
  const currentStatus = process.env.ANTI_DELETE_ENABLED === 'true' || 
                       process.env.ANTI_DELETE_ENABLED === '1';

  try {
    if (!action) {
      // Show status information
      const stats = await getStorageStats();
      const oldestMsg = getOldestMessage();
      
      const statusMessage = {
        text: `🗑️ *ANTI-DELETE STATUS*\n\n` +
              `📊 *Status:* ${currentStatus ? '✅ Enabled' : '❌ Disabled'}\n` +
              `💾 *Messages Stored:* ${stats.count}\n` +
              `📁 *Storage Size:* ${stats.size}\n` +
              `⏳ *Oldest Message:* ${oldestMsg ? new Date(oldestMsg).toLocaleString() : 'None'}\n` +
              `🕒 *Retention Time:* 30 minutes\n\n` +
              `📝 *Usage:*\n` +
              `• \`antidelete on\` - Enable feature\n` +
              `• \`antidelete off\` - Disable feature\n` +
              `• \`antidelete status\` - Current status\n` +
              `• \`antidelete stats\` - Storage details\n` +
              `• \`antidelete clear\` - Clear all messages\n\n` +
              `ℹ️ Messages auto-expire after 30 minutes.`
      };
      
      await sock.sendMessage(from, statusMessage);
      return;
    }

    switch (action) {
      case 'on':
      case 'enable':
        process.env.ANTI_DELETE_ENABLED = 'true';
        logger.info('Anti-delete feature enabled by owner');
        await sock.sendMessage(from, { 
          text: '✅ *Anti-delete enabled!*\n\n🔔 Now monitoring message deletions.'
        });
        break;
        
      case 'off':
      case 'disable':
        process.env.ANTI_DELETE_ENABLED = 'false';
        logger.info('Anti-delete feature disabled by owner');
        await sock.sendMessage(from, { 
          text: '❌ *Anti-delete disabled!*\n\n🔕 No longer monitoring deletions.'
        });
        break;
        
      case 'status':
        const statusStats = await getStorageStats();
        await sock.sendMessage(from, {
          text: `📊 *DETAILED STATUS*\n\n` +
                `⚙️ *Feature:* ${currentStatus ? '✅ Enabled' : '❌ Disabled'}\n` +
                `💾 *Messages:* ${statusStats.count}\n` +
                `📁 *Storage:* ${statusStats.size}\n` +
                `⏳ *Uptime:* ${formatUptime(process.uptime())}\n` +
                `🕒 *Retention:* 30 minutes`
        });
        break;
        
      case 'stats':
        const storageStats = await getStorageStats();
        const oldestMessage = getOldestMessage();
        const newestMessage = getNewestMessage();
        
        await sock.sendMessage(from, {
          text: `📈 *STORAGE STATISTICS*\n\n` +
                `💾 *Total Messages:* ${storageStats.count}\n` +
                `📁 *File Size:* ${storageStats.size}\n` +
                `⏳ *Oldest Message:* ${oldestMessage ? new Date(oldestMessage).toLocaleString() : 'None'}\n` +
                `🕒 *Newest Message:* ${newestMessage ? new Date(newestMessage).toLocaleString() : 'None'}\n` +
                `🧹 *Cleanups Performed:* ${storageStats.cleanups || 0}\n` +
                `⏱️ *Storage Path:* ${messageStorage.storagePath}`
        });
        break;
        
      case 'clear':
        await clearStorage();
        logger.info('Message storage cleared by owner');
        await sock.sendMessage(from, {
          text: '🧹 *Storage cleared successfully!*\n\n💾 All stored messages have been deleted.'
        });
        break;
        
      default:
        await sock.sendMessage(from, {
          text: `❌ Invalid option: "${action}"\n\n📝 Valid options: on, off, status, stats, clear`
        });
    }
  } catch (error) {
    logger.error({
      error: error.message,
      stack: error.stack,
      command: 'antidelete',
      action,
      processingTime: Date.now() - commandStartTime
    }, 'Command processing failed');
    
    await sock.sendMessage(from, { 
      text: '❌ An error occurred while processing the command.'
    });
  }
}

// Helper functions
async function getStorageStats() {
  try {
    const stats = await fs.stat(messageStorage.storagePath);
    return {
      count: messageStorage.messages.size,
      size: `${(stats.size / 1024).toFixed(2)} KB`,
      cleanups: messageStorage.cleanupCount || 0
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { count: 0, size: '0 KB', cleanups: 0 };
    }
    logger.error({
      error: error.message,
      stack: error.stack
    }, 'Failed to get storage stats');
    return { count: 0, size: 'Error', cleanups: 0 };
  }
}

function getOldestMessage() {
  let oldest = null;
  for (const data of messageStorage.messages.values()) {
    if (!oldest || data.timestamp < oldest) {
      oldest = data.timestamp;
    }
  }
  return oldest;
}

function getNewestMessage() {
  let newest = null;
  for (const data of messageStorage.messages.values()) {
    if (!newest || data.timestamp > newest) {
      newest = data.timestamp;
    }
  }
  return newest;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  seconds %= 3600 * 24;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

async function clearStorage() {
  try {
    await messageStorage.acquireLock();
    messageStorage.messages.clear();
    await messageStorage.saveMessages();
    logger.info('Storage cleared successfully');
  } catch (error) {
    logger.error({
      error: error.message,
      stack: error.stack
    }, 'Failed to clear storage');
    throw error;
  } finally {
    messageStorage.releaseLock();
  }
}

// Export storage instance for cleanup
export { messageStorage };

// Command metadata
antidelete.description = "Advanced anti-delete feature with message storage (Owner only)";
antidelete.emoji = "🗑️🔍";
antidelete.ownerOnly = true;
antidelete.category = "Administration";