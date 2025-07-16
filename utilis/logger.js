// utils/logger.js
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log file path relative to the project root
const logFilePath = path.join(__dirname, '..', 'logs', 'app.log'); // logs/app.log

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // Default log level from env or 'info'
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), // Include stack trace for errors
        winston.format.splat(), // Allows for string interpolation
        winston.format.json() // Output logs as JSON
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Add colors to console output
                winston.format.simple() // Simple format for console (e.g., info: message)
            ),
            level: 'debug' // Console will show debug and above
        }),
        new winston.transports.File({
            filename: logFilePath,
            level: 'info', // File will log info and above
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5, // Keep 5 files
            tailable: true // Start writing to a new file when the current one exceeds size
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join(__dirname, '..', 'logs', 'exceptions.log') })
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: path.join(__dirname, '..', 'logs', 'rejections.log') })
    ],
    exitOnError: false // Do not exit on handled exceptions
});

// Create 'logs' directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

export default logger;