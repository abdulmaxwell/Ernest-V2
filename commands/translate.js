import axios from 'axios';

export default async function translate(sock, msg, from) {
    const args = msg.body.slice('/translate'.length).trim().split(' ');
    let text = args.join(' ');
    let toLang = 'en'; // Default translation language

    // Check if the last arg is a specific language like "to=fr"
    const lastArg = args[args.length - 1];
    if (lastArg && lastArg.toLowerCase().startsWith('to=')) {
        toLang = lastArg.substring('to='.length);
        text = args.slice(0, -1).join(' '); // Remove language from text
    }

    if (!text) {
        await sock.sendMessage(from, { text: 'Please provide text to translate. Example: /translate Hello to=fr' });
        return;
    }

    // Removed: await sock.sendMessage(from, { text: WARNING_MESSAGE });
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    await sock.sendMessage(from, { text: `Translating to ${toLang}...` });

    try {
        const apiUrl = `https://apis.davidcyriltech.my.id/tools/translate?text=${encodeURIComponent(text)}&to=${encodeURIComponent(toLang)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.success && data.translated_text) {
            const formattedResponse = `Original Text: "${data.original_text || text}"\n` +
                                      `Translated Text (to ${data.language || toLang}): "${data.translated_text}"\n\n` +
                                      `_Creator: pease ernest_`;
            await sock.sendMessage(from, { text: formattedResponse });
        } else {
            await sock.sendMessage(from, { text: `Could not translate "${text}" to ${toLang}. Please ensure the language code is valid.` });
        }
    } catch (error) {
        console.error('Error in /translate command:', error);
        await sock.sendMessage(from, { text: 'An error occurred while trying to translate. Please try again later.' });
    }
}

translate.description = "Translates text to a specified language. Usage: /translate <text> [to=lang_code]";
translate.emoji = "🌐";
translate.category = "Utility";