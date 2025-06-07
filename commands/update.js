// commands/update.js
import { exec } from 'child_process'; // Using 'exec' for slightly better error handling and output
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import dotenv from 'dotenv';
dotenv.config();

export default async function update(sock, msg, from) {
    // --- Owner Check ---
    const ownerJid = process.env.OWNER_NUMBER ? jidNormalizedUser(process.env.OWNER_NUMBER.trim()) : null;

    if (!ownerJid || from !== ownerJid) {
        await sock.sendMessage(from, { text: "🚫 You are not authorized to use this command. Only the bot owner can update my code." }, { quoted: msg });
        return;
    }
    // --- End Owner Check ---

    try {
        await sock.sendMessage(from, { text: "⬆️ Pulling latest code from repository... This might take a moment." }, { quoted: msg });

        // Execute git pull
        exec('git pull', async (gitError, gitStdout, gitStderr) => {
            if (gitError) {
                console.error('Git pull error:', gitError);
                await sock.sendMessage(from, { text: `❌ Git pull failed: ${gitError.message}` }, { quoted: msg });
                return;
            }

            let response = `✅ Git pull successful!\n\`\`\`\n${gitStdout}\n\`\`\``;
            console.log('Git pull output:', gitStdout);

            // Check if there were actual changes (not just "Already up to date.")
            if (gitStdout.includes('Already up to date.')) {
                response = "✅ Bot is already running the latest code. No update needed.";
                await sock.sendMessage(from, { text: response }, { quoted: msg });
                return;
            }

            // If changes were pulled, run npm install
            await sock.sendMessage(from, { text: "📦 New code pulled. Installing dependencies..." }, { quoted: msg });
            exec('npm install', async (npmError, npmStdout, npmStderr) => {
                if (npmError) {
                    console.error('NPM install error:', npmError);
                    await sock.sendMessage(from, { text: `❌ NPM install failed: ${npmError.message}\n\nUpdate incomplete.` }, { quoted: msg });
                    return;
                }
                console.log('NPM install output:', npmStdout);
                await sock.sendMessage(from, { text: `✅ Dependencies installed. Now restarting to apply updates...` }, { quoted: msg });

                // Trigger restart after successful pull and install
                setTimeout(() => {
                    process.exit(0); // Exit to trigger restart by process manager
                }, 1000); // 1 second delay
            });
        });

    } catch (error) {
        console.error('Error during update command:', error);
        await sock.sendMessage(from, { text: `❌ Failed to initiate update. Error: ${error.message}` }, { quoted: msg });
    }
}

export const description = "⬆️ [OWNER] Pulls latest code from GitHub and restarts.";
export const category = "owner";