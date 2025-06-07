// Assuming this is in your vv.js file
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs/promises';
import path from 'path';

const stealViewOnce = async (sock, msg, from, args) => {
  try {
    console.log("DEBUG: Running stealViewOnce command...");

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      console.log("DEBUG: No message quoted.");
      return await sock.sendMessage(from, { text: "Please reply to a message containing media (image/video)." }, { quoted: msg });
    }

    // --- Refined logic starts here ---
    let mediaToDownload = null;
    let mediaType = null;

    // 1. Check if it's directly an imageMessage or videoMessage
    if (quoted.imageMessage) {
      mediaToDownload = quoted.imageMessage;
      mediaType = 'image';
      console.log("DEBUG: Quoted message identified as direct image.");
    } else if (quoted.videoMessage) {
      mediaToDownload = quoted.videoMessage;
      mediaType = 'video';
      console.log("DEBUG: Quoted message identified as direct video.");
    }
    // 2. If not direct, check if it's a viewOnceMessageV2
    else if (quoted.viewOnceMessageV2) {
      const viewOnceContent = quoted.viewOnceMessageV2.message;
      if (viewOnceContent?.imageMessage) {
        mediaToDownload = viewOnceContent.imageMessage;
        mediaType = 'image';
        console.log("DEBUG: Quoted message identified as viewOnceMessageV2 containing an image.");
      } else if (viewOnceContent?.videoMessage) {
        mediaToDownload = viewOnceContent.videoMessage;
        mediaType = 'video';
        console.log("DEBUG: Quoted message identified as viewOnceMessageV2 containing a video.");
      }
    }

    if (!mediaToDownload || !mediaType) {
      console.log(`DEBUG: Quoted message type not recognized for media download. Keys: ${Object.keys(quoted)}`);
      return await sock.sendMessage(from, { text: "The replied message does not contain a supported image or video." }, { quoted: msg });
    }

    console.log(`DEBUG: Attempting to download ${mediaType}.`);
    const stream = await downloadContentFromMessage(mediaToDownload, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    if (buffer.length === 0) {
      console.log("DEBUG: Downloaded buffer is empty.");
      return await sock.sendMessage(from, { text: "Failed to download the media content." }, { quoted: msg });
    }

    const ext = mediaType === 'image' ? 'jpg' : 'mp4';
    const filename = `stolen_media_${msg.key.id}.${ext}`;
    const tempDir = path.join(process.cwd(), 'temp');
    const filePath = path.join(tempDir, filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    console.log(`DEBUG: Downloaded and saved as ${filename}`);

    // Send the media back
    // ... (rest of your stealViewOnce function code)

    // Generate the dynamic caption
    let captionText = "";
    if (mediaType === 'image') {
      captionText = "📸 ErnestV2 has successfully gotten your image!";
    } else if (mediaType === 'video') {
      captionText = "🎥 ErnestV2 has successfully gotten your video!";
    } else {
      captionText = "ErnestV2 has successfully gotten your media!"; // Fallback, though should be covered by checks
    }

    // Send the media back with the dynamic caption
    if (mediaType === 'image') {
      await sock.sendMessage(from, { image: { url: filePath }, caption: captionText });
    } else if (mediaType === 'video') {
      await sock.sendMessage(from, { video: { url: filePath }, caption: captionText });
    }

    // ... (rest of your stealViewOnce function code)
    
    await fs.unlink(filePath); // Clean up temp file
    console.log(`DEBUG: Deleted temporary file ${filePath}`);

  } catch (err) {
    console.error("❌ Error in stealViewOnce:", err);
    console.error("❌ Error stack:", err.stack);
    await sock.sendMessage(from, { text: `An error occurred while trying to steal the media: ${err.message}` }, { quoted: msg });
  }
};

// Add command metadata
stealViewOnce.description = "Steals media (image/video) from a replied message, including view once.";
stealViewOnce.category = "Utility";
stealViewOnce.usage = "/vv - Reply to an image or video (including view once).";
stealViewOnce.emoji = "👀";

export default stealViewOnce;