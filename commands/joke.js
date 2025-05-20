import axios from 'axios';

export default async function joke(sock, msg, from) {
    try {
        const response = await axios.get('https://v2.jokeapi.dev/joke/Any?type=single');
        const joke = response.data?.joke || "No joke found, but hey, you're still awesome 😅";

        const jokeBox = `
╔══ 🎭  RANDOM JOKE  🎭 ══╗
${joke}
╚══════════════════════╝
`.trim();

        await sock.sendMessage(from, { 
            text: jokeBox,
            quoted: msg
        });
    } catch (error) {
        console.error('Error in joke:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to fetch a joke. Try again later!',
            quoted: msg 
        });
    }
}

export const description = "Get a random joke to lighten the mood";
export const category = "fun";

joke.description = "get a random joke";
joke.category = "funny";