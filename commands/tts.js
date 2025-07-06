const axios = require('axios');

export default async function tts(sock, msg, from) {
    const args = msg.body.slice('/tts'.length).trim().split(' ');
    let text = '';
    let voice = 'Bianca'; // Default voice for your API

    // Check if the last arg is a specific voice like "voice=xyz"
    const lastArg = args[args.length - 1];
    if (lastArg && lastArg.toLowerCase().startsWith('voice=')) {
        voice = lastArg.substring('voice='.length);
        text = args.slice(0, -1).join(' '); // Remove voice part from text
    } else {
        text = args.join(' '); // If no voice specified, all args are text
    }

    if (!text) {
        await sock.sendMessage(from, { text: 'Please provide text to convert to speech. Example: /tts Hello world' });
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    let voiceMessage = `Converting text to speech (Voice: ${voice})...`;
    if (voice === 'Bianca') {
        voiceMessage += `\n_Note: 'Bianca' is the default voice. Other voices may be available but are not officially supported or listed by Ernest Tech House._`;
    } else {
        voiceMessage += `\n_Note: You've requested voice '${voice}'. If this voice does not work, it might not be supported by the third-party API. Try again without specifying a voice, or try 'voice=Bianca'._`;
    }
    await sock.sendMessage(from, { text: voiceMessage });

    try {
        const apiUrl = `https://apis.davidcyriltech.my.id/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.success && data.audioUrl) {
            const formattedResponse = `Here is your audio: ${data.audioUrl}\n\n` +
                                      `_Creator: pease ernest_`;
            await sock.sendMessage(from, { text: formattedResponse });
        } else {
            // Provide more specific feedback if the voice might be the issue
            let errorMessage = `Could not generate speech for "${text}". The service might be unavailable.`;
            if (voice !== 'Bianca') {
                errorMessage += ` If you specified a voice (${voice}), it might not be supported. Try again with just the text.`;
            }
            await sock.sendMessage(from, { text: errorMessage });
        }
    } catch (error) {
        console.error('Error in /tts command:', error);
        await sock.sendMessage(from, { text: 'An error occurred while trying to generate speech. Please try again later.' });
    }
}

tts.description = "Converts text to speech. Usage: /tts <text> [voice=name]";
tts.emoji = "🔊";
tts.category = "Utility";