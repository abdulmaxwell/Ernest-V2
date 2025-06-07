import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
// Fix for SyntaxError: Named export 'fromBuffer' not found
import pkg from 'file-type';
const { fromBuffer } = pkg;


/**
 * Upload file to Telegraph (Telegram's file hosting service)
 * Features:
 * - Free file hosting by Telegram
 * - Permanent storage
 * - Fast CDN delivery
 * - Supports images, videos, documents
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<string>} - Returns the Telegraph URL
 */
const uploadToTelegraph = async (filePath) => {
  return new Promise(async (resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return reject(new Error("File not found at the specified path"));
    }
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));
      
      // Upload to Telegraph
      const response = await axios({
        url: "https://telegra.ph/upload",
        method: "POST",
        headers: {
          ...formData.getHeaders() // Include multipart form headers
        },
        data: formData
      });
      
      // Return the full Telegraph URL
      return resolve('https://telegra.ph' + response.data[0].src);
      
    } catch (error) {
      return reject(new Error(`Telegraph upload failed: ${error.message}`));
    }
  });
};

/**
 * Upload buffer to Telegraph (for in-memory files)
 * @param {Buffer} buffer - File buffer data
 * @param {string} filename - Original filename with extension
 * @returns {Promise<string>} - Returns the Telegraph URL
 */
const uploadBufferToTelegraph = async (buffer, filename = 'file') => {
  return new Promise(async (resolve, reject) => {
    try {
      // Detect file type if no extension provided
      if (!path.extname(filename)) {
        const fileType = await fromBuffer(buffer); // 'fromBuffer' is now correctly imported
        if (fileType) {
          filename = filename + '.' + fileType.ext;
        }
      }
      
      // Create form data with buffer
      const formData = new FormData();
      formData.append("file", buffer, filename);
      
      // Upload to Telegraph
      const response = await axios({
        url: "https://telegra.ph/upload",
        method: "POST",
        headers: {
          ...formData.getHeaders()
        },
        data: formData
      });
      
      return resolve('https://telegra.ph' + response.data[0].src);
      
    } catch (error) {
      return reject(new Error(`Telegraph buffer upload failed: ${error.message}`));
    }
  });
};

// ==================== COMMAND FUNCTIONS ====================

/**
 * Upload files to Telegraph hosting
 * Usage: Reply to any file/media with "telegraph" or send with caption "telegraph"
 * Features: Free, permanent hosting by Telegram
 */
export default async function telegraph(sock, msg, from, args) {
  try {
    let quoted = msg.quoted || msg;
    let mediaBuffer = null;
    let mediaType = 'file';
    let fileName = 'unknown';
    
    // Check for different types of media in the message
    if (quoted && quoted.message) {
      const message = quoted.message;
      
      if (message.imageMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'image';
        fileName = message.imageMessage.caption || 'image.jpg';
        // Ensure proper extension for images
        if (!fileName.includes('.')) {
          fileName += '.jpg';
        }
      } else if (message.videoMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'video';
        fileName = message.videoMessage.caption || 'video.mp4';
        if (!fileName.includes('.')) {
          fileName += '.mp4';
        }
      } else if (message.audioMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'audio';
        fileName = 'audio.mp3';
      } else if (message.documentMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'document';
        fileName = message.documentMessage.fileName || 'document.pdf';
      } else if (message.stickerMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'sticker';
        fileName = 'sticker.webp';
      }
    }
    
    // Check current message for media
    if (!mediaBuffer && msg.message) {
      const message = msg.message;
      
      if (message.imageMessage) {
        mediaBuffer = await sock.downloadMediaMessage(msg);
        mediaType = 'image';
        fileName = message.imageMessage.caption || 'image.jpg';
        if (!fileName.includes('.')) {
          fileName += '.jpg';
        }
      } else if (message.videoMessage) {
        mediaBuffer = await sock.downloadMediaMessage(msg);
        mediaType = 'video';
        fileName = message.videoMessage.caption || 'video.mp4';
        if (!fileName.includes('.')) {
          fileName += '.mp4';
        }
      } else if (message.documentMessage) {
        mediaBuffer = await sock.downloadMediaMessage(msg);
        mediaType = 'document';
        fileName = message.documentMessage.fileName || 'document.pdf';
      }
    }
    
    // If no media found, send usage instructions
    if (!mediaBuffer) {
      await sock.sendMessage(from, { 
        text: '📡 *Telegraph File Uploader*\n\n' +
              '❌ No file detected!\n\n' +
              '*How to use:*\n' +
              '1️⃣ Reply to any file with "telegraph"\n' +
              '2️⃣ Send any file with caption "telegraph"\n\n' +
              '*Supported files:*\n' +
              '• 📸 Images (JPG, PNG, GIF, WebP)\n' +
              '• 🎥 Videos (MP4, AVI, MOV, etc.)\n' +
              '• 🎵 Audio (MP3, WAV, OGG, etc.)\n' +
              '• 📄 Documents (PDF, DOC, TXT, etc.)\n' +
              '• 🎭 Stickers\n\n' +
              '*Telegraph Features:*\n' +
              '• ✅ Free hosting by Telegram\n' +
              '• ✅ Permanent storage\n' +
              '• ✅ Fast global CDN\n' +
              '• ✅ No registration required\n' +
              '• ✅ Direct link access'
      });
      return;
    }

    // Get file size information
    const fileSizeKB = Math.round(mediaBuffer.length / 1024);
    const fileSizeMB = (fileSizeKB / 1024).toFixed(2);
    
    // Send processing message
    await sock.sendMessage(from, { 
      text: `📡 *Uploading to Telegraph...*\n\n` +
            `📄 File: ${fileName}\n` +
            `📊 Type: ${mediaType.toUpperCase()}\n` +
            `📦 Size: ${fileSizeMB} MB\n` +
            `🌐 Service: Telegraph (Telegram)`
    });

    // Upload the file buffer to Telegraph
    const telegraphUrl = await uploadBufferToTelegraph(mediaBuffer, fileName);
    
    // Send success response
    const response = `✅ *Telegraph Upload Complete!*\n\n` +
                     `📄 *File:* ${fileName}\n` +
                     `📊 *Type:* ${mediaType.toUpperCase()}\n` +
                     `📦 *Size:* ${fileSizeMB} MB\n` +
                     `🌐 *Service:* Telegraph (Telegram)\n` +
                     `⏰ *Storage:* Permanent\n\n` +
                     `🔗 *Direct Link:*\n${telegraphUrl}\n\n` +
                     `💡 *Benefits:*\n` +
                     `• Fast loading worldwide\n` +
                     `• Reliable Telegram CDN\n` +
                     `• No expiry date\n` +
                     `• Free forever`;

    await sock.sendMessage(from, { 
      text: response,
      contextInfo: {
        externalAdReply: {
          title: `Telegraph Upload: ${fileName}`,
          body: `${mediaType.toUpperCase()} • ${fileSizeMB} MB • Permanent Storage`,
          // Ensure thumbnailUrl is only provided for images
          thumbnailUrl: mediaType === 'image' ? telegraphUrl : undefined,
          mediaType: 1, // MEDIATYPE_IMAGE
          showAdAttribution: false,
          sourceUrl: telegraphUrl
        }
      }
    });

  } catch (error) {
    console.error('Telegraph upload error:', error);
    await sock.sendMessage(from, { 
      text: `❌ *Telegraph Upload Failed*\n\n` +
            `*Error:* ${error.message}\n\n` +
            `*Common issues:*\n` +
            `• File too large for Telegraph (Telegraph usually limits to ~5MB-10MB)\n` +
            `• Unsupported file format by Telegraph\n` +
            `• Network connection problems\n` +
            `• Telegraph service temporarily down\n\n` +
            `*Solutions:*\n` +
            `• Try a smaller file size\n` +
            `• Check internet connection\n` +
            `• Try again in a few minutes\n` +
            `• Use supported formats (images and small videos often work best)`
    });
  }
}

telegraph.description = "Upload files to Telegraph (Telegram hosting)";
telegraph.emoji = "📡";

/**
 * Upload image specifically to Telegraph with optimization
 * Usage: tgimg (reply to image)
 */
export async function tgimg(sock, msg, from, args) {
  try {
    let quoted = msg.quoted || msg;
    
    // Check for image in message
    let imageBuffer = null;
    if (quoted?.message?.imageMessage) {
      imageBuffer = await sock.downloadMediaMessage(quoted);
    } else if (msg?.message?.imageMessage) {
      imageBuffer = await sock.downloadMediaMessage(msg);
    }
    
    if (!imageBuffer) {
      await sock.sendMessage(from, { 
        text: '📸 *Telegraph Image Upload*\n\n' +
              '❌ Please reply to an image or send an image!\n\n' +
              '*Optimized for:*\n' +
              '• JPG, PNG, GIF, WebP\n' +
              '• Fast image hosting\n' +
              '• Perfect for sharing photos'
      });
      return;
    }

    await sock.sendMessage(from, { text: '📸 Uploading image to Telegraph...' });

    // Detect image type
    const fileType = await fromBuffer(imageBuffer); // 'fromBuffer' is now correctly imported
    const fileName = `image.${fileType?.ext || 'jpg'}`; // Fallback to 'jpg' if type detection fails
    
    const telegraphUrl = await uploadBufferToTelegraph(imageBuffer, fileName);
    const fileSizeMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);
    
    await sock.sendMessage(from, { 
      text: `📸 *Image uploaded to Telegraph!*\n\n` +
            `📦 Size: ${fileSizeMB} MB\n` +
            `🔗 Link: ${telegraphUrl}\n\n` +
            `💡 Perfect for sharing images anywhere!`,
      contextInfo: {
        externalAdReply: {
          title: "Telegraph Image Upload",
          body: `${fileSizeMB} MB • Permanent Storage`,
          thumbnailUrl: telegraphUrl,
          mediaType: 1, // MEDIATYPE_IMAGE
          showAdAttribution: false,
          sourceUrl: telegraphUrl
        }
      }
    });

  } catch (error) {
    console.error('tgimg upload error:', error); // More specific error logging
    await sock.sendMessage(from, { text: `❌ Image upload failed: ${error.message}\n\n💡 Try a smaller image or a different format.` });
  }
}

tgimg.description = "Upload images to Telegraph hosting";
tgimg.emoji = "📸";

/**
 * Get Telegraph upload information and tips
 * Usage: tginfo
 */
export async function tginfo(sock, msg, from, args) {
  try {
    const infoText = `📡 *Telegraph File Hosting Information*\n\n` +
                     `*What is Telegraph?*\n` +
                     `Telegraph is Telegram's free file hosting service that provides fast, reliable CDN hosting worldwide.\n\n` +
                     `*Features:*\n` +
                     `✅ Free forever\n` +
                     `✅ Permanent storage\n` +
                     `✅ Fast global CDN\n` +
                     `✅ No registration needed\n` +
                     `✅ Direct link access\n` +
                     `✅ Mobile & desktop friendly\n\n` +
                     `*Best for:*\n` +
                     `• Images and photos\n` +
                     `• Small videos\n` +
                     `• Documents and files\n` +
                     `• Temporary file sharing\n\n` +
                     `*Available Commands:*\n` +
                     `• \`telegraph\` - Upload any file\n` +
                     `• \`tgimg\` - Upload images (optimized)\n` +
                     `• \`tginfo\` - Show this information\n\n` +
                     `*Usage Tips:*\n` +
                     `• Works best with images\n` +
                     `• Keep files under ~5MB-10MB for best performance\n` + // Clarified size limit
                     `• Files are stored permanently\n` +
                     `• Links work in any browser`;

    await sock.sendMessage(from, { text: infoText });

  } catch (error) {
    console.error('tginfo error:', error); // More specific error logging
    await sock.sendMessage(from, { text: `❌ Error getting Telegraph info: ${error.message}` });
  }
}

tginfo.description = "Get Telegraph hosting information";
tginfo.emoji = "ℹ️";

// Export functions for external use
export { uploadToTelegraph, uploadBufferToTelegraph };

// Commented out usage examples as they are handled by the 'description' and 'emoji' properties for bot loaders.
//# Upload any file
//Reply to file: telegraph

//# Upload image (optimized)
////Reply to image: tgimg

//# Get information
//Command: tginfo