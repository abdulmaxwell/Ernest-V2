import cron from 'node-cron';
import { config } from 'dotenv';
config();

const footer = '\n\n> This message was sent automatically by Ernest v2 bot 🤖';

function broadcast(sock, numbers, message) {
    for (const number of numbers) {
        sock.sendMessage(number, {
            text: `${message}${footer}`
        }).then(() => {
            console.log(`✅ Sent scheduled message to ${number}`);
        }).catch(err => {
            console.error(`❌ Failed to send to ${number}`, err);
        });
    }
}

export function initScheduler(sock) {
    const specialNumbers = (process.env.SPECIAL_NUMBERS || '')
        .split(',')
        .map(n => n.trim())
        .filter(n => n)
        .map(n => n.includes('@') ? n : `${n}@s.whatsapp.net`);

    if (!specialNumbers.length) {
        console.log("⚠️ No special numbers to schedule for.");
        return;
    }

    // 7:00 AM
    cron.schedule('0 7 * * *', () => {
        const msg = process.env.MORNING_MESSAGE || "Morning! 🌅";
        broadcast(sock, specialNumbers, msg);
    });

    // 10:30 AM
    cron.schedule('30 10 * * *', () => {
        const msg = process.env.MID_MESSAGE || "Mid-morning check-in ☕";
        broadcast(sock, specialNumbers, msg);
    });

    // 9:00 PM
    cron.schedule('0 21 * * *', () => {
        const msg = process.env.NIGHT_MESSAGE || "Good night 🌙";
        broadcast(sock, specialNumbers, msg);
    });

    console.log("🕒 Daily schedulers set!");
}
