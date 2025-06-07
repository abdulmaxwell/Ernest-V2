import fs from 'fs';
import { tmpdir } from 'os';
import ff from 'fluent-ffmpeg';
import * as webp from 'node-webpmux';
import path from 'path';


const makeid = (length) => {
  let result = '';
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

async function imageToWebp(imageBuffer) {
  const outputPath = path.join(tmpdir(), makeid(10) + '.webp');
  const inputPath = path.join(tmpdir(), makeid(10) + ".jpg");
  
  fs.writeFileSync(inputPath, imageBuffer);
  
  await new Promise((resolve, reject) => {
    ff(inputPath)
      .on('error', reject)
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

async function videoToWebp(videoBuffer) {
  const outputPath = path.join(tmpdir(), makeid(10) + ".webp");
  const inputPath = path.join(tmpdir(), makeid(10) + '.mp4');
  
  fs.writeFileSync(inputPath, videoBuffer);
  
  await new Promise((resolve, reject) => {
    ff(inputPath)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        '-vcodec', "libwebp", 
        "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse", 
        "-loop", '0', 
        "-ss", "00:00:00", 
        '-t', "00:00:05", 
        "-preset", 'default', 
        "-an", 
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

async function addExifData(webpBuffer, metadata) {
  const inputPath = path.join(tmpdir(), makeid(10) + ".webp");
  const outputPath = path.join(tmpdir(), makeid(10) + '.webp');
  
  fs.writeFileSync(inputPath, webpBuffer);
  
  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      'sticker-pack-id': "https://instagram.com/surya_skylark05",
      'sticker-pack-name': metadata.packname || '',
      'sticker-pack-publisher': metadata.author || '',
      'emojis': metadata.categories || ['']
    };
    
    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x0, 0x8, 0x0, 0x0, 0x0, 0x1, 0x0, 0x41, 0x57, 0x7, 0x0, 0x0, 0x0, 0x0, 0x0, 0x16, 0x0, 0x0, 0x0]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    
    await img.load(inputPath);
    fs.unlinkSync(inputPath);
    img.exif = exif;
    await img.save(outputPath);
    
    return fs.readFileSync(outputPath);
  }
  
  return webpBuffer;
}

export default async function sticker(sock, msg, from) {
  try {
    // Check if message has media
    if (!msg.message?.imageMessage && !msg.message?.videoMessage) {
      await sock.sendMessage(from, { 
        text: 'Please reply to an image or video to convert it to a sticker!\n\nUsage: sticker [packname] [author]' 
      });
      return;
    }

    // Get media message
    const mediaMessage = msg.message.imageMessage || msg.message.videoMessage;
    
    // Download media
    const mediaBuffer = await sock.downloadMediaMessage(msg);
    
    // Parse command arguments
    const args = msg.body?.split(' ').slice(1) || [];
    const packname = args[0] || 'My Stickers';
    const author = args[1] || 'Bot User';
    
    // Send processing message
    await sock.sendMessage(from, { text: '🔄 Converting to sticker...' });
    
    let webpBuffer;
    
    // Convert based on media type
    if (msg.message.imageMessage) {
      webpBuffer = await imageToWebp(mediaBuffer);
    } else if (msg.message.videoMessage) {
      webpBuffer = await videoToWebp(mediaBuffer);
    }
    
    // Add EXIF data
    const stickerBuffer = await addExifData(webpBuffer, {
      packname: packname,
      author: author,
      categories: ['😀']
    });
    
    // Send sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer
    });
    
  } catch (error) {
    console.error('Sticker creation error:', error);
    await sock.sendMessage(from, { 
      text: '❌ Failed to create sticker. Please make sure you replied to a valid image or video.' 
    });
  }
}

sticker.description = "Convert images and videos to WhatsApp stickers";
sticker.emoji = "🏷️";

//dsnt work keeps saying reply to am image and i have 

//second option