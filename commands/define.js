import axios from 'axios';

export default async function define(sock, msg, from, args) {
    if (!args.length) {
        return sock.sendMessage(from, { text: '❌ Please provide a word to define.\n\n📘 Usage: `!define <word>`' }, { quoted: msg });
    }

    const word = args.join(' ');

    try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        const entry = response.data[0];

        let definitionText = `📚 *Definition of "${entry.word}"*\n`;

        // Include phonetics if available
        if (entry.phonetics?.length) {
            const phonetic = entry.phonetics.find(p => p.text)?.text;
            if (phonetic) definitionText += `🗣️ Pronunciation: _${phonetic}_\n`;
        }

        definitionText += '\n';

        entry.meanings.forEach((meaning, index) => {
            definitionText += `*${index + 1}. ${meaning.partOfSpeech}*\n`;
            meaning.definitions.slice(0, 3).forEach((def, i) => {
                definitionText += `   • ${def.definition}\n`;
                if (def.example) {
                    definitionText += `     _Example_: "${def.example}"\n`;
                }
            });
            definitionText += '\n';
        });

        await sock.sendMessage(from, { text: definitionText.trim() }, { quoted: msg });

    } catch (error) {
        console.error('❌ Error fetching definition:', error?.response?.data || error.message);
        await sock.sendMessage(from, {
            text: `❌ Couldn't find definition for "*${word}*".\n\nTry a simpler word or check spelling.`,
        }, { quoted: msg });
    }
}

export const description = "Define a word using dictionary API";
export const category = "tools";

define.description = "Define a word using dictionary API";
define.category = "tools";
//done
