// data/specialContactsStorage.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utilis/logger.js'; // Adjust path as per your setup

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECIAL_CONTACTS_FILE_PATH = path.resolve(__dirname, '../special_contacts.json');

const specialContactsStorage = {
    _specialContacts: new Set(), // Stores normalized JIDs (e.g., '254712345678@s.whatsapp.net')
    isInitialized: false,
    _saveTimeout: null,
    _isSaving: false,

    async initialize() {
        if (this.isInitialized) {
            logger.debug('Special contacts storage already initialized.');
            return;
        }

        if (fs.existsSync(SPECIAL_CONTACTS_FILE_PATH)) {
            try {
                const data = fs.readFileSync(SPECIAL_CONTACTS_FILE_PATH, 'utf8');
                const loadedContacts = JSON.parse(data);
                if (Array.isArray(loadedContacts)) {
                    loadedContacts.forEach(jid => this._specialContacts.add(jid));
                }
                logger.info(`Loaded ${this._specialContacts.size} special contacts from ${SPECIAL_CONTACTS_FILE_PATH}`);
            } catch (error) {
                logger.error(`Error loading special contacts from ${SPECIAL_CONTACTS_FILE_PATH}:`, error);
                this._specialContacts = new Set();
                logger.warn('Corrupted special contacts file detected. Starting with empty storage.');
            }
        } else {
            logger.info(`No existing special contacts file found at ${SPECIAL_CONTACTS_FILE_PATH}. Starting new.`);
        }
        this.isInitialized = true;
    },

    /**
     * Adds a JID to the special contacts list.
     * @param {string} jid - The normalized JID (e.g., '254712345678@s.whatsapp.net').
     * @returns {boolean} True if added, false if already exists.
     */
    addContact(jid) {
        if (!this.isInitialized) {
            logger.warn('Special contacts storage not initialized. Skipping addContact.');
            return false;
        }
        if (this._specialContacts.has(jid)) {
            return false; // Already exists
        }
        this._specialContacts.add(jid);
        logger.debug(`Added special contact: ${jid}`);
        this._scheduleSave();
        return true;
    },

    /**
     * Removes a JID from the special contacts list.
     * @param {string} jid - The normalized JID.
     * @returns {boolean} True if removed, false if not found.
     */
    removeContact(jid) {
        if (!this.isInitialized) {
            logger.warn('Special contacts storage not initialized. Skipping removeContact.');
            return false;
        }
        if (!this._specialContacts.has(jid)) {
            return false; // Not found
        }
        this._specialContacts.delete(jid);
        logger.debug(`Removed special contact: ${jid}`);
        this._scheduleSave();
        return true;
    },

    /**
     * Checks if a JID is in the special contacts list.
     * @param {string} jid - The normalized JID.
     * @returns {boolean} True if present, false otherwise.
     */
    hasContact(jid) {
        return this._specialContacts.has(jid);
    },

    /**
     * Returns an array of all special contact JIDs.
     * @returns {string[]} An array of normalized JIDs.
     */
    getAllContacts() {
        return Array.from(this._specialContacts);
    },

    _scheduleSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => this._performSave(), 2000); // Debounce for 2 seconds
    },

    async _performSave() {
        if (this._isSaving) {
            logger.warn('Already saving special contacts to file. Skipping this save cycle.');
            return;
        }
        this._isSaving = true;
        try {
            const dataToSave = Array.from(this._specialContacts); // Convert Set to Array for JSON
            fs.writeFileSync(SPECIAL_CONTACTS_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf8');
            logger.debug('Special contacts storage saved to file.');
        } catch (error) {
            logger.error('Error saving special contacts to file:', error);
        } finally {
            this._isSaving = false;
        }
    },

    async saveOnShutdown() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        if (!this._isSaving) {
            await this._performSave();
            logger.info('Final special contacts save on shutdown completed.');
        } else {
            logger.warn('Skipping final special contacts save on shutdown as a save is already in progress.');
        }
    }
};

export default specialContactsStorage;