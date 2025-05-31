export default async function quote(sock, msg, from) {
    try {
        const quotes = [
            { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
            { text: "Whether you think you can or you can't, you're right.", author: "Henry Ford" },
            { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
            { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
            { text: "Be so good they can't ignore you.", author: "Steve Martin" },
            { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" },
            { text: "Discipline equals freedom.", author: "Jocko Willink" },
            { text: "If you're going through hell, keep going.", author: "Winston Churchill" },
            { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
            { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
            { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
            { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
            { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
            { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
            { text: "If you want to achieve greatness, stop asking for permission.", author: "Anonymous" },
            { text: "Don't limit your challenges. Challenge your limits.", author: "Anonymous" },
            { text: "Hustle in silence. Let success make the noise.", author: "Anonymous" },
            { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
            { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
            { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
            { text: "Work hard in silence, let your success be the noise.", author: "Frank Ocean" },
            // New motivational quotes
            { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
            { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
            { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
            { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
            { text: "Your limitation—it's only your imagination.", author: "Anonymous" },
            { text: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Anonymous" },
            { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
            { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
            { text: "Don't stop when you're tired. Stop when you're done.", author: "Anonymous" },
            { text: "Great things never come from comfort zones.", author: "Anonymous" },
            { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
            { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
            { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll" },
            { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
            { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
        ];

        // Get random quotes (between 3-7 quotes)
        const numQuotes = Math.floor(Math.random() * 5) + 3;
        const shuffled = [...quotes].sort(() => Math.random() - 0.5);
        const selectedQuotes = shuffled.slice(0, numQuotes);

        // Dynamic emojis for variety
        const headerEmojis = ['🧠', '💡', '⭐', '🚀', '💪', '🎯', '✨'];
        const footerEmojis = ['🔥', '💯', '⚡', '🌟', '🎉', '👑', '💎'];
        
        const randomHeaderEmoji = headerEmojis[Math.floor(Math.random() * headerEmojis.length)];
        const randomFooterEmoji = footerEmojis[Math.floor(Math.random() * footerEmojis.length)];

        // Create formatted message
        let message = `*${randomHeaderEmoji} Daily Inspiration ${randomHeaderEmoji}*\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n\n`;

        selectedQuotes.forEach((quote, index) => {
            message += `*${index + 1}.* _"${quote.text}"_\n`;
            message += `   — *${quote.author}*\n\n`;
        });

        // Dynamic footer messages
        const motivationalFooters = [
            `${randomFooterEmoji} _Your potential is endless. Go make it happen!_`,
            `${randomFooterEmoji} _Today is your canvas. Paint it beautifully._`,
            `${randomFooterEmoji} _Champions are made when nobody's watching._`,
            `${randomFooterEmoji} _Your dreams don't have expiration dates._`,
            `${randomFooterEmoji} _Success starts with self-belief._`,
            `${randomFooterEmoji} _Turn your wounds into wisdom._`,
            `${randomFooterEmoji} _Progress, not perfection._`
        ];

        const randomFooter = motivationalFooters[Math.floor(Math.random() * motivationalFooters.length)];
        
        message += `${randomFooter}\n`;
        message += `💬 _Powered by Ernest Tech House_`;

        // Check message length and split if needed
        const maxLength = 4000; // WhatsApp limit with buffer
        
        if (message.length > maxLength) {
            // Split into chunks if too long
            const chunks = [];
            let currentChunk = `*${randomHeaderEmoji} Daily Inspiration ${randomHeaderEmoji}*\n━━━━━━━━━━━━━━━━━━━\n\n`;
            
            selectedQuotes.forEach((quote, index) => {
                const quoteLine = `*${index + 1}.* _"${quote.text}"_\n   — *${quote.author}*\n\n`;
                
                if ((currentChunk + quoteLine).length > maxLength - 200) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                }
                currentChunk += quoteLine;
            });
            
            currentChunk += `${randomFooter}\n💬 _Powered by Ernest Tech House_`;
            chunks.push(currentChunk);
            
            // Send chunks with small delay
            for (let i = 0; i < chunks.length; i++) {
                await sock.sendMessage(from, { text: chunks[i] }, { quoted: msg });
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                }
            }
        } else {
            // Send as single message
            await sock.sendMessage(from, { text: message }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in quote function:', error);
        
        // Enhanced error messages
        const errorMessages = [
            '⚠️ Quotes are taking a coffee break. But remember: *You are your own inspiration.*',
            '⚠️ Technical hiccup detected. Here\'s a manual quote: *"Every expert was once a beginner."*',
            '⚠️ Quote engine offline. But you know what? *Your story is the best quote of all.*',
            '⚠️ System busy inspiring others. Meanwhile: *Be the energy you want to attract.*'
        ];
        
        const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        
        await sock.sendMessage(from, {
            text: randomError
        }, { quoted: msg });
    }
}

// Export metadata
export const description = "Send inspiring daily quotes with variety and style";
export const category = "motivation";

// Legacy support
quote.description = "Send you inspiring daily quotes to motivate and uplift your day";
quote.category = "motivation";