import axios from 'axios';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export default async function stt(sock, msg) {
  try {
    const from = msg.key.remoteJid;
    
    if (!msg.message.audioMessage && !msg.message.voiceMessage) {
      return await sock.sendMessage(from, {
        text: "Please send a voice note or audio file to transcribe"
      });
    }

    await sock.sendPresenceUpdate('recording', from);

    // Download the audio
    const audioBuffer = await sock.downloadMediaMessage(msg);
    const tempFile = join(tmpdir(), `stt_${Date.now()}.ogg`);
    await fs.writeFile(tempFile, audioBuffer);

    // Prepare form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFile));

    // Call Python API
    const response = await axios.post('http://localhost:5000/api/stt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const transcribedText = response.data.text || "No text recognized";
    
    await sock.sendMessage(from, {
      text: `🔊 Transcription:\n\n${transcribedText}`,
      mentions: [msg.key.participant || from]
    }, { quoted: msg });

    await fs.unlink(tempFile);

  } catch (error) {
    console.error('STT Error:', error);
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⚠️ Failed to transcribe audio. Please try again with clearer audio."
    });
  }
}

export const description = "Convert speech/voice messages to text";
export const category = "Utility";
stt.usage = "Reply to a voice message with .stt or send audio";