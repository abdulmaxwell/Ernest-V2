import fs from 'fs';
import { tmpdir } from 'os';
import Crypto from 'crypto';
import ffmpeg from '@ffmpeg-installer/ffmpeg'; // This line requires the package to be installed
import ff from 'fluent-ffmpeg'; // This line requires the package to be installed
import webp from 'node-webpmux'; // This line requires the package to be installed
import path from 'path';

ff.setFfmpegPath(ffmpeg.path);


async function imageToWebp(buffer) {
  const outputPath = path.join(tmpdir(), Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + '.webp');
  const inputPath = path.join(tmpdir(), Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + '.jpg');
  
  fs.writeFileSync(inputPath, buffer);
  
  await new Promise((resolve, reject) => {
    ff(inputPath)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
      ])
      .toFormat("webp")
      .save(outputPath);
  });
  
  const result = fs.readFileSync(outputPath);
  fs.unlinkSync(outputPath);
  fs.unlinkSync(inputPath);
  return result;
}

async function videoToWebp(buffer) {
  const outputPath = path.join(tmpdir(), Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + ".webp");
  const inputPath = path.join(tmpdir(), Crypto.randomBytes(6).readUIntLE(0, 6).toString(36) + ".mp4");
  
  fs.writeFileSync(inputPath, buffer);
  
  await new Promise((resolve, reject) => {
    ff(inputPath)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
        "-loop", '0',
        "-ss", '00:00:00',
        '-t', '00:00:05', // Max 5 seconds for video stickers
        "-preset", "default",
        "-an", // No audio
        "-vsync", '0'
      ])
      .toFormat("webp")
      .save(outputPath);
  });
  
  const result = fs.readFileSync(outputPath);
  fs.unlinkSync(outputPath);
  fs.unlinkSync(inputPath);
  return result;
}

async function addExif(buffer, packname, author, categories = [''], options = {}) {
  const img = new webp.Image();
  const packId = Crypto.randomBytes(32).toString("hex");
  
  const metadata = {
    'sticker-pack-id': packId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': categories,
    ...options
  };
  
  let exifHeader = Buffer.from([0x49, 0x49, 0x2a, 0x0, 0x8, 0x0, 0x0, 0x0, 0x1, 0x0, 0x41, 0x57, 0x7, 0x0, 0x0, 0x0, 0x0, 0x0, 0x16, 0x0, 0x0, 0x0]);
  let exifData = Buffer.from(JSON.stringify(metadata), 'utf8');
  let exifBuffer = Buffer.concat([exifHeader, exifData]);
  exifBuffer.writeUIntLE(exifData.length, 14, 4);
  
  await img.load(buffer);
  img.exif = exifBuffer;
  return await img.save(null);
}

async function createSticker(media, options = {}) {
  const { packname = 'Bot Stickers', author = 'WhatsApp Bot', categories = ['🤖'] } = options;
  
  let webpBuffer;
  
  if (/webp/.test(media.mimetype)) {
    webpBuffer = media.data;
  } else if (/image/.test(media.mimetype)) {
    webpBuffer = await imageToWebp(media.data);
  } else if (/video/.test(media.mimetype)) {
    webpBuffer = await videoToWebp(media.data);
  } else {
    throw new Error('Unsupported media type. Please send an image or video.');
  }
  
  return await addExif(webpBuffer, packname, author, categories);
}

export default async function sticker(sock, msg, from) {
    // SAFELY GET THE MESSAGE TEXT
    const messageText = msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || 
                        msg.message?.imageMessage?.caption || 
                        ''; 
    const args = messageText.split(' ').slice(1); // Now messageText is guaranteed to be a string
    
    // Check if message has media
    const quotedMsg = msg.quoted || msg;
    
    if (!quotedMsg.message?.imageMessage && !quotedMsg.message?.videoMessage && !quotedMsg.message?.stickerMessage) {
        await sock.sendMessage(from, { 
            text: '🎨 *Sticker Creator*\n\n' +
                  '📝 Usage:\n' +
                  '1. Send an image/video with `/sticker`\n' +
                  '2. Reply to an image/video with `/sticker`\n\n' +
                  '🏷️ Custom Options:\n' +
                  '`/sticker [packname] [author]`\n\n' +
                  '💡 Examples:\n' +
                  '`/sticker`\n' +
                  '`/sticker MyPack BotMaker`\n' +
                  '`/sticker "Cool Stickers" "My Bot"`\n\n' +
                  '📋 Supported formats:\n' +
                  '• Images: JPG, PNG, WebP\n' +
                  '• Videos: MP4, GIF (max 5 seconds)\n' +
                  '• Max size: 320x320px'
        });
        return;
    }
    
    // Parse custom pack name and author
    let packname = 'Pease Ernest';
    let author = 'Ernest Pease';
    
    // Use arguments to set packname and author, prioritizing quoted messages' captions first for clarity
    // If command is like "/sticker MyPack MyAuthor"
    if (args.length >= 1) {
        packname = args[0].replace(/['"]/g, ''); // Remove quotes if present
    }
    if (args.length >= 2) {
        author = args[1].replace(/['"]/g, ''); // Remove quotes if present
    }
    
    // Send processing message
    await sock.sendMessage(from, { 
        text: '🎨 Creating sticker...\n\n' +
              `📦 Pack: ${packname}\n` +
              `👤 Author: ${author}\n\n` +
              '⏳ Please wait...'
    });
    
    try {
        // Download media
        // Ensure download handles different message types (quoted or direct message media)
        let mediaBuffer = null;
        let originalMimetype = '';

        if (quotedMsg.message?.imageMessage) {
            mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
            originalMimetype = quotedMsg.message.imageMessage.mimetype;
        } else if (quotedMsg.message?.videoMessage) {
            mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
            originalMimetype = quotedMsg.message.videoMessage.mimetype;
        } else if (quotedMsg.message?.stickerMessage) {
            // If it's already a sticker, no need to convert, just add EXIF or re-send
            // For simplicity, we'll download and let createSticker re-process if needed
            mediaBuffer = await sock.downloadMediaMessage(quotedMsg);
            originalMimetype = quotedMsg.message.stickerMessage.mimetype;
        }

        if (!mediaBuffer) {
            await sock.sendMessage(from, { 
                text: '❌ Failed to download media. Please try again.' 
            });
            return;
        }
        
        const mediaObject = {
            data: mediaBuffer,
            mimetype: originalMimetype || 'application/octet-stream' // Fallback mimetype
        };
        
        // Create sticker
        const stickerBuffer = await createSticker(mediaObject, {
            packname: packname,
            author: author,
            categories: ['🤖'] // Default emoji category
        });
        
        // Send sticker
        await sock.sendMessage(from, {
            sticker: stickerBuffer
        });
        
        await sock.sendMessage(from, { 
            text: `✅ Sticker created successfully!\n\n` +
                  `📦 Pack: ${packname}\n` +
                  `👤 Author: ${author}`
        });
        
    } catch (error) {
        console.error('Sticker creation error:', error);
        
        let errorMessage = '❌ Failed to create sticker: ';
        
        if (error.message.includes('Unsupported media type')) {
            errorMessage += 'Unsupported file format. Please send an image or video.';
        } else if (error.message.includes('ffmpeg')) {
            errorMessage += 'FFmpeg processing error. This might be due to a corrupt or very large video/image. Please try with a different file.';
        } else if (error.message.includes('webp')) {
            errorMessage += 'WebP processing error. The media might be malformed or too complex. Please try again.';
        } else {
            errorMessage += `An unknown error occurred: ${error.message}`;
        }
        
        errorMessage += '\n\n💡 Make sure your file is:\n• An image (JPG, PNG, WebP) or video (MP4, GIF)\n• Video is max 5 seconds\n• Not excessively large (under ~10MB is best)';
        
        await sock.sendMessage(from, { text: errorMessage });
    }
}

sticker.description = "Convert images and videos to WhatsApp stickers";
sticker.emoji = "🎨";
sticker.usage = "/sticker [packname] [author] - Reply to or send with image/video";