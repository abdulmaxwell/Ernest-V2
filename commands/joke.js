import axios from 'axios';

export default async function joke(sock, msg, from) {
    try {
        const response = await axios.get('https://v2.jokeapi.dev/joke/Any?type=single');
        const jokeBox = `
╔════════════════════════════╗
║        😂 RANDOM JOKE      ║
╠════════════════════════════╣
║ ${response.data.joke}      ║
╚════════════════════════════╝
`.trim();

        await sock.sendMessage(from, { 
            text: jokeBox,
            quoted: msg
        });
    } catch (error) {
        console.error('Error in joke:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to fetch joke',
            quoted: msg 
        });
    }
}

export const description = "Tells a random joke";