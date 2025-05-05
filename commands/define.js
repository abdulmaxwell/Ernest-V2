import axios from 'axios';

export default async function define(sock, msg, from, args) {
    if (!args[0]) {
        return sock.sendMessage(from, { text: '❌ Please provide a word\nUsage: !define <word>' }, { quoted: msg });
    }

    try {
        const word = args[0];
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = response.data[0];
        
        let definitionText = `📚 *Definition of ${word}*\n\n`;
        
        data.meanings.forEach(meaning => {
            definitionText += `*${meaning.partOfSpeech}*\n`;
            meaning.definitions.slice(0, 3).forEach((def, i) => {
                definitionText += `${i+1}. ${def.definition}\n`;
            });
            definitionText += '\n';
        });
        
        await sock.sendMessage(from, { text: definitionText }, { quoted: msg });
    } catch (error) {
        console.error('Error in define:', error);
        await sock.sendMessage(from, { text: '❌ Word not found or API error' }, { quoted: msg });
    }
}

export const description = "Gets dictionary definition of a word";