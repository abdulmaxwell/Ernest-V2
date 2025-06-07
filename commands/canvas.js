// No external imports are needed for this text-based version
// import { spawn } from 'child_process';
// import { join } from 'path';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';

// The core logic is now contained within the main export function.
// The previous 'levelup' helper function is removed as it relied on ImageMagick/GraphicsMagick.

export default async function levelupimg(sock, msg, from) {
    // 1. Safely get the message text from the incoming WhatsApp message object.
    // This handles various message types (plain text, extended text like replies/mentions, captions from images/videos).
    const messageText = msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || 
                        msg.message?.imageMessage?.caption || 
                        ''; 

    // 2. Parse arguments: Split the message text by spaces and remove the command prefix.
    // Example: If messageText is "!levelup PlayerOne 25", args will be ["PlayerOne", "25"].
    const args = messageText.split(' ').slice(1); 
    
    // 3. Handle incorrect usage (not enough arguments).
    if (args.length < 2) {
        await sock.sendMessage(from, { 
            text: '🎮 *Level Up Message Generator*\n\n' + // Updated title for clarity
                  '📝 Usage: /levelup [username] [level]\n\n' +
                  '💡 Examples:\n' +
                  '/levelup PlayerOne 25\n' +
                  '/levelup GamerTag 100\n' +
                  '/levelup MyName 1\n\n' +
                  'This command generates a text-based level up notification.' // Explain it's text-based
        });
        return; // Stop execution if usage is incorrect
    }
    
    // 4. Extract username and level.
    // For simplicity, we assume the first word after the command is the username, and the second is the level.
    // If you need multi-word usernames, you'll need more advanced parsing (e.g., regex, or a separator).
    const username = args[0]; 
    const levelString = args[1]; // Get level as a string first for parsing

    // 5. Validate the level input.
    const level = parseInt(levelString); // Convert string to integer
    
    if (isNaN(level) || level < 1) { // Check if it's a valid number and greater than 0
        await sock.sendMessage(from, { 
            text: '❌ Invalid level! Please provide a valid number greater than 0.\n\n' +
                  'Example: /levelup PlayerOne 25' 
        });
        return; // Stop execution if level is invalid
    }
    
    // 6. (Optional) Set a display limit for the level.
    // This is not a technical limit, but a logical one to prevent excessively large numbers in the message.
    if (level > 99999) { 
        await sock.sendMessage(from, { 
            text: '❌ Level too high! Maximum display level is 99999.\n\n' +
                  'Example: /levelup PlayerOne 25' 
        });
        return; // Stop execution if level exceeds display limit
    }
    
    // 7. Try to generate and send the level up message.
    try {
        // Construct the rich text message using markdown for formatting (bold, italics).
        // Emojis add visual flair without needing image files.
        const levelUpMessage = `🎉 *LEVEL UP!* 🎉\n\n` +
                               `🌟 Congratulations, *${username}*!\n` +
                               `You have reached Level *${level}*!\n\n` +
                               `Keep up the great work! 💪`;
        
        // Send the message using sock.sendMessage
        await sock.sendMessage(from, {
            text: levelUpMessage
        });
        
    } catch (error) {
        // 8. Handle any unexpected errors during message construction or sending.
        console.error('Level up message generation error:', error);
        await sock.sendMessage(from, { 
            text: '❌ An unexpected error occurred while generating the level up message. Please try again.' 
        });
    }
}

// 9. Export command metadata for your bot's command loader.
// This helps your main bot handler understand what the command does, its emoji, and how to use it.
levelupimg.description = "Generate a text-based level up celebration message";
levelupimg.emoji = "🎮";
levelupimg.usage = "/levelup [username] [level]"; 
// Removed detailed usage as the help message inside the function covers it.