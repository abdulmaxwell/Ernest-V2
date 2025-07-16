// data/messageStorage.js
// This module manages the storage and retrieval of text messages for anti-delete functionality.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Needed for __dirname with ES Modules

// Assuming your logger is in 'utils/logger.js' directly at the bot's root level
import logger from '../utilis/logger.js'; // Path adjusted: Up one level to bot_folder, then down into utils

// To get __dirname in ES Modules (this will be 'your_bot_folder/data')
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path for the JSON file relative to the bot's root directory
// We go up one level from 'data' folder to get to the bot's root
const STORAGE_FILE_PATH = path.resolve(__dirname, '../deleted_text_messages.json');

const messageStorage = {
    _messages: new Map(), // In-memory store
    isInitialized: false,
    _saveTimeout: null,    // For debouncing saves
    _isSaving: false,      // Flag to prevent concurrent writes

    async initialize() {
        if (this.isInitialized) {
            logger.debug('Message storage already initialized.');
            return;
        }

        if (fs.existsSync(STORAGE_FILE_PATH)) {
            try {
                const data = fs.readFileSync(STORAGE_FILE_PATH, 'utf8');
                const loadedMessages = JSON.parse(data);
                for (const [id, msg] of Object.entries(loadedMessages)) {
                    this._messages.set(id, msg);
                }
                logger.info(`Loaded ${this._messages.size} messages from ${STORAGE_FILE_PATH}`);
            } catch (error) {
                logger.error(`Error loading messages from ${STORAGE_FILE_PATH}:`, error);
                this._messages = new Map();
                logger.warn('Corrupted message storage file detected. Starting with empty storage.');
            }
        } else {
            logger.info(`No existing message storage file found at ${STORAGE_FILE_PATH}. Starting new.`);
        }
        this.isInitialized = true;
    },

    /**
     * Stores a simplified text message object.
     * @param {string} messageId - The unique ID of the message.
     * @param {object} msgData - The simplified message data (chatId, sender, type, text, timestamp, etc.).
     */
    async storeMessage(messageId, msgData) {
        if (!this.isInitialized) {
            logger.warn('Message storage not initialized. Skipping storeMessage.');
            return;
        }
        this._messages.set(messageId, msgData);
        logger.debug(`Stored text message ID: ${messageId}`);
        this._scheduleSave(); // Schedule a debounced save
    },

    /**
     * Retrieves a stored message by its ID.
     * @param {string} messageId - The unique ID of the message.
     * @returns {object|undefined} The stored message data, or undefined if not found.
     */
    getMessage(messageId) {
        return this._messages.get(messageId);
    },

    /**
     * Schedules a debounced save to file to prevent excessive disk writes.
     */
    _scheduleSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        // Save after 5 seconds of inactivity (no new storeMessage calls)
        this._saveTimeout = setTimeout(() => this._performSave(), 5000);
    },

    /**
     * Performs the actual file save operation.
     * Prevents concurrent writes.
     */
    async _performSave() {
        if (this._isSaving) {
            logger.warn('Already saving messages to file. Skipping this save cycle.');
            return;
        }
        this._isSaving = true;
        try {
            const dataToSave = {};
            this._messages.forEach((value, key) => {
                dataToSave[key] = value;
            });
            fs.writeFileSync(STORAGE_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf8');
            logger.debug('Message storage saved to file.');
        } catch (error) {
            logger.error('Error saving messages to file:', error);
        } finally {
            this._isSaving = false;
        }
    },

    /**
     * Prunes old messages from storage to manage file size.
     * @param {number} daysOld - Messages older than this many days will be removed.
     */
    async pruneOldMessages(daysOld = 7) {
        if (!this.isInitialized) return;

        const cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - daysOld);

        let messagesRemoved = 0;
        for (const [id, msg] of this._messages.entries()) {
            if (msg.timestamp && new Date(msg.timestamp) < cutOffDate) {
                this._messages.delete(id);
                messagesRemoved++;
            }
        }
        if (messagesRemoved > 0) {
            logger.info(`Pruned ${messagesRemoved} old messages from storage.`);
            await this._performSave(); // Force a save after pruning
        }
    },

    // Optional: Call this when the bot is gracefully shutting down
    async saveOnShutdown() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        if (!this._isSaving) {
            await this._performSave();
            logger.info('Final message storage save on shutdown completed.');
        } else {
            logger.warn('Skipping final save on shutdown as a save is already in progress.');
        }
    }
};

export default messageStorage;