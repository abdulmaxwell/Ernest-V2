export default async function quote(sock, msg, from) {
    try {
        const quotes = [
            { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
            { text: "Whether you think you can or you can’t, you’re right.", author: "Henry Ford" },
            { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
            { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
            { text: "Be so good they can't ignore you.", author: "Steve Martin" },
            { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" },
            { text: "Discipline equals freedom.", author: "Jocko Willink" },
            { text: "If you’re going through hell, keep going.", author: "Winston Churchill" },
            { text: "It always seems impossible until it’s done.", author: "Nelson Mandela" },
            { text: "Your time is limited, so don’t waste it living someone else’s life.", author: "Steve Jobs" },
            { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
            { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
            { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
            { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
            { text: "If you want to achieve greatness, stop asking for permission.", author: "Unknown" },
            { text: "Don’t limit your challenges. Challenge your limits.", author: "Unknown" },
            { text: "Hustle in silence. Let success make the noise.", author: "Unknown" },
            { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
            { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
            { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
            { text: "Work hard in silence, let your success be the noise.", author: "Frank Ocean" }
        ];

        // Shuffle quotes
        const shuffled = quotes.sort(() => Math.random() - 0.5);

        // Format into chunks (WhatsApp hates long blocks)
        const chunks = [];
        let chunk = '*🧠 Quotes of the Day 🧠*\n━━━━━━━━━━━━━━\n';

        shuffled.forEach((q, i) => {
            const line = `*${i + 1}.* "${q.text}"\n_— ${q.author}_\n\n`;
            if ((chunk + line).length > 3000) {
                chunks.push(chunk);
                chunk = '';
            }
            chunk += line;
        });

        chunks.push(chunk);
        chunks[chunks.length - 1] += '🔥 _Powered by Ernest Tech House_\n💬 _Use them. Live them. Share them._';

        for (const part of chunks) {
            await sock.sendMessage(from, { text: part }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in quote:', error);
        await sock.sendMessage(from, {
            text: '⚠️ Could not load quotes. But you? You’re still the main character today.',
            quoted: msg
        });
    }
}

export const description = "Sends shuffled daily quotes in bite-sized pieces";
export const category = "fun";

quote.description = "send you nice quotes "
quote.category = " funny";