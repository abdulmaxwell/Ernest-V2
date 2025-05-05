import axios from 'axios';

export default async function quote(sock, msg, from) {
    try {
        const response = await axios.get('https://api.quotable.io/random', {
            timeout: 5000
        });

        const quoteText = response.data.content.length > 50 
            ? `${response.data.content.substring(0, 50)}...`
            : response.data.content;

        const quoteBox = `
╔════════════════════════════╗
║        💬 DAILY QUOTE      ║
╠════════════════════════════╣
║ "${quoteText}"             ║
║                            ║
║ — ${response.data.author.padEnd(20)} ║
╚════════════════════════════╝
`.trim();

        await sock.sendMessage(from, { text: quoteBox }, { quoted: msg });
    } catch (error) {
        console.error('Error in quote:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to fetch quote. Please try again later.',
            quoted: msg 
        });
    }
}

export const description = "Shares an inspirational quote";