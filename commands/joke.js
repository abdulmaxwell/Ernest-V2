import axios from 'axios';

export default async function joke(sock, msg, from, args) {
    try {
        // Show typing indicator for better UX
        await sock.sendPresenceUpdate('composing', from);

        // Check for specific joke categories
        const category = args?.[0]?.toLowerCase();
        const validCategories = ['programming', 'misc', 'dark', 'pun', 'spooky', 'christmas'];
        
        // Build API URL based on user preference
        let apiUrl = 'https://v2.jokeapi.dev/joke/';
        
        if (category === 'clean') {
            apiUrl += 'Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single';
        } else if (validCategories.includes(category)) {
            apiUrl += `${category}?type=single`;
        } else if (category === 'setup') {
            apiUrl += 'Any?type=twopart'; // Setup-punchline jokes
        } else {
            // Default: clean jokes only
            apiUrl += 'Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit';
        }

        console.log('Fetching joke from:', apiUrl);

        // Fetch joke with timeout
        const response = await axios.get(apiUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Ernest-Bot/2.0'
            }
        });

        const jokeData = response.data;

        if (!jokeData || jokeData.error) {
            throw new Error(`API Error: ${jokeData?.message || 'Unknown error'}`);
        }

        let jokeText = '';
        let jokeEmoji = '😂';

        // Handle different joke types
        if (jokeData.type === 'single') {
            jokeText = jokeData.joke;
        } else if (jokeData.type === 'twopart') {
            jokeText = `*Q:* ${jokeData.setup}\n\n*A:* ${jokeData.delivery}`;
            jokeEmoji = '🤔➡️😂';
        }

        // Get category-specific emoji
        const categoryEmojis = {
            programming: '💻',
            misc: '🎲',
            dark: '🖤',
            pun: '😏',
            spooky: '👻',
            christmas: '🎄'
        };

        const displayEmoji = categoryEmojis[jokeData.category?.toLowerCase()] || jokeEmoji;

        // Format the joke nicely
        const jokeBox = 
            `╭─────「 ${displayEmoji} *JOKE TIME* ${displayEmoji} 」─────╮\n` +
            `│\n` +
            `${jokeText.split('\n').map(line => `│ ${line}`).join('\n')}\n` +
            `│\n` +
            `├─────────────────────────────────\n` +
            `│ 📂 Category: *${jokeData.category || 'General'}*\n` +
            `│ 🆔 ID: #${jokeData.id || 'Unknown'}\n` +
            `│ 🎭 Type: *${jokeData.type === 'twopart' ? 'Setup & Punchline' : 'One-liner'}*\n` +
            `╰─────────────────────────────────╯\n\n` +
            `😄 _Hope that made you smile!_\n` +
            `💡 _Try: .joke clean, .joke programming, .joke setup_`;

        await sock.sendMessage(from, { 
            text: jokeBox
        }, { quoted: msg });

        // Stop typing indicator
        await sock.sendPresenceUpdate('paused', from);

    } catch (error) {
        console.error('❌ Error in joke command:', error);
        
        // Stop typing indicator on error
        await sock.sendPresenceUpdate('paused', from);

        // Enhanced error handling with fallback jokes
        const fallbackJokes = [
            "Why don't scientists trust atoms? Because they make up everything! 😂",
            "I told my wife she was drawing her eyebrows too high. She looked surprised! 😮",
            "Why don't eggs tell jokes? They'd crack each other up! 🥚😂",
            "What do you call a fake noodle? An impasta! 🍝😄",
            "Why did the scarecrow win an award? He was outstanding in his field! 🌾🏆",
            "What's the best thing about Switzerland? I don't know, but the flag is a big plus! 🇨🇭➕",
            "Why don't skeletons fight each other? They don't have the guts! 💀😂",
            "What do you call a dinosaur that crashes his car? Tyrannosaurus Wrecks! 🦕💥"
        ];

        const randomFallback = fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)];
        
        let errorMessage = '';
        
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            errorMessage = 
                `⏰ *Connection Timeout*\n\n` +
                `🌐 The joke API is taking too long to respond.\n` +
                `😅 Here's a backup joke instead:\n\n` +
                `╭─────「 🎭 *BACKUP JOKE* 🎭 」─────╮\n` +
                `│ ${randomFallback}\n` +
                `╰──────────────────────────────╯`;
        } else if (error.response?.status === 429) {
            errorMessage = 
                `⚠️ *Rate Limited*\n\n` +
                `🚫 Too many requests to the joke API.\n` +
                `⏱️ Please wait a moment and try again.\n\n` +
                `😄 Meanwhile, here's a classic:\n` +
                `${randomFallback}`;
        } else {
            errorMessage = 
                `❌ *Joke Service Unavailable*\n\n` +
                `🔧 Having trouble connecting to the joke database.\n` +
                `🎭 But don't worry, here's one from our vault:\n\n` +
                `╭─────「 🎪 *EMERGENCY JOKE* 🎪 」─────╮\n` +
                `│ ${randomFallback}\n` +
                `╰───────────────────────────────────╯\n\n` +
                `💡 _Try again in a few moments!_`;
        }

        await sock.sendMessage(from, { 
            text: errorMessage
        }, { quoted: msg });
    }
}

// Enhanced metadata
export const description = "Get random jokes from various categories with setup/punchline options";
export const category = "fun";

// Legacy support
joke.description = "Get hilarious random jokes to brighten your day";
joke.category = "fun";
joke.usage = "joke [category]";
joke.example = "joke programming";
joke.aliases = ["funny", "humor", "laugh"];

// Add help info
joke.help = `*🎭 Joke Command Help*

*Usage:* .joke [category]

*Categories:*
• \`clean\` - Family-friendly jokes only
• \`programming\` - Coding & tech humor
• \`pun\` - Puns and wordplay
• \`setup\` - Setup & punchline format
• \`misc\` - Random mixed jokes

*Examples:*
• \`.joke\` - Random clean joke
• \`.joke programming\` - Tech jokes
• \`.joke setup\` - Q&A format jokes

*Features:*
✅ Multiple joke sources
✅ Clean content filtering
✅ Fallback jokes if API fails
✅ Various categories available`;