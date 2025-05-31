import cron from 'node-cron';
import { config } from 'dotenv';
config();

const footer = '\n\n> THis is the next level Bot automation';

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

    // Get timezone from env or default to UTC
    const timezone = process.env.TIMEZONE || 'UTC';
    console.log(`🌍 Using timezone: ${timezone}`);

    // 7:00 AM with timezone
    cron.schedule('0 7 * * *', () => {
        const msg = process.env.MORNING_MESSAGE || "Morning! 🌅";
        console.log(`📅 7:00 AM trigger - Current time: ${new Date().toLocaleString()}`);
        broadcast(sock, specialNumbers, msg);
    }, {
        timezone: timezone
    });

    // 10:30 AM with timezone
    cron.schedule('30 10 * * *', () => {
        const msg = process.env.MID_MESSAGE || "Mid-morning check-in ☕";
        console.log(`📅 10:30 AM trigger - Current time: ${new Date().toLocaleString()}`);
        broadcast(sock, specialNumbers, msg);
    }, {
        timezone: timezone
    });

    // 9:00 PM with timezone
    cron.schedule('0 21 * * *', () => {
        const msg = process.env.NIGHT_MESSAGE || "Good night 🌙";
        console.log(`📅 9:00 PM trigger - Current time: ${new Date().toLocaleString()}`);
        broadcast(sock, specialNumbers, msg);
    }, {
        timezone: timezone
    });

    console.log("🕒 Daily schedulers set!");
    console.log(`🌍 Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`⏰ Current server time: ${new Date().toLocaleString()}`);
}