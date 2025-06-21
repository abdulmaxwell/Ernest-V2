// commands/tts.js
import fs from 'fs/promises'; // Use fs.promises for async file operations
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios'; // Import axios instead of node-fetch

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANT: Replace with a real TTS API endpoint and API Key if required.
// For demonstration, this is a placeholder. A simple free one might be available,
// but often have limitations. For production, consider Google Cloud TTS, IBM Watson, etc.
const TTS_API_BASE_URL = 'https://api.voicerss.org/'; // Example placeholder
const TTS_API_KEY = process.env.VOICE_RSS_API_KEY || 'YOUR_VOICERSS_API_KEY_HERE'; // Get an API key if using VoiceRSS or similar

export default async function tts(sock, msg, from, args) {
    const textToSpeak = args.join(' ');

    if (!textToSpeak) {
        await sock.sendMessage(from, { text: "Please provide text to convert to audio. Example: `.say Hello there, I am Peace Ernest`" });
        return;
    }

    try {
        await sock.sendPresenceUpdate('recording', from); // Indicate recording status

        // Construct the URL and parameters for the TTS API
        // This is highly dependent on the chosen TTS API.
        // For VoiceRSS, parameters are typically sent via query string.
        const params = {
            key: TTS_API_KEY,
            hl: 'en-us',
            src: textToSpeak,
            c: 'OGG' // OGG for Opus encoding, suitable for WhatsApp voice notes
        };

        const response = await axios.get(TTS_API_BASE_URL, {
            params: params,
            responseType: 'arraybuffer' // Important for Axios to get binary data as a Buffer
        });

        if (response.status !== 200) {
            console.error(`TTS API Error: ${response.status} - ${response.data ? new TextDecoder().decode(response.data) : 'No response data'}`);
            await sock.sendMessage(from, { text: "Failed to convert text to audio. The TTS service returned an error." });
            return;
        }

        const audioBuffer = Buffer.from(response.data); // Axios's response.data is an ArrayBuffer, convert to Node.js Buffer
        const outputPath = path.join(__dirname, `../temp_audio_${Date.now()}.ogg`); // Use .ogg for Opus

        await fs.writeFile(outputPath, audioBuffer);

        await sock.sendMessage(from, {
            audio: { url: outputPath },
            mimetype: 'audio/ogg',
            ptt: true // This marks it as a voice message (Push To Talk)
        });

        await fs.unlink(outputPath); // Clean up the temporary file
        console.log(`Successfully sent TTS audio for: "${textToSpeak}"`);

    } catch (error) {
        console.error('Error in TTS command:', error);
        // More specific error handling for Axios:
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Axios Response Error Data:', error.response.data ? new TextDecoder().decode(error.response.data) : 'No data');
                console.error('Axios Response Status:', error.response.status);
                console.error('Axios Response Headers:', error.response.headers);
                await sock.sendMessage(from, { text: `TTS service error: ${error.response.status}. Please check your API key or the text.` });
            } else if (error.request) {
                // The request was made but no response was received
                console.error('Axios Request Error:', error.request);
                await sock.sendMessage(from, { text: "Could not reach the TTS service. Please check your internet connection or the API URL." });
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Axios Setup Error:', error.message);
                await sock.sendMessage(from, { text: "An internal error occurred with the TTS request setup." });
            }
        } else {
            await sock.sendMessage(from, { text: "An unexpected error occurred while processing your request." });
        }
    } finally {
        await sock.sendPresenceUpdate('paused', from); // Revert presence
    }
}

export const description = "Converts text to an audio voice note.";
export const category = "Utility";

tts.description = "Converts text to an audio voice note.";
tts.category = "Utility";