import axios from 'axios';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export default async function tts(sock, msg) {
  try {
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    
    // Remove command prefix
    const textToConvert = text.replace(/^\.tts\s*/i, '').trim();
    
    if (!textToConvert) {
      return await sock.sendMessage(from, {
        text: "Please provide text to convert. Example: .tts hello world"
      });
    }

    await sock.sendPresenceUpdate('composing', from);

    // Call Python API
    const response = await axios.post('http://localhost:5000/api/tts', 
      { text: textToConvert },
      { responseType: 'arraybuffer' }
    );

    const tempFile = join(tmpdir(), `tts_${Date.now()}.wav`);
    await fs.writeFile(tempFile, response.data);

    await sock.sendMessage(from, {
      audio: { url: tempFile },
      mimetype: 'audio/wav',
      ptt: true
    }, { quoted: msg });

    await fs.unlink(tempFile);

  } catch (error) {
    console.error('TTS Error:', error);
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⚠️ Failed to generate speech. Please try again later."
    });
  }
}

export const description = "Convert text to speech using local AI";
export const category = "Media";
tts.usage = ".tts <your text>";