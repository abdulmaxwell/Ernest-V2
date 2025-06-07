// Required dependencies
import fetch from 'node-fetch';
import FormData from 'form-data';
// Corrected import for 'file-type'
import pkg from 'file-type';
const { fromBuffer } = pkg; // Destructure fromBuffer from the default export

/**
 * Upload ephemeral file to file.io
 * Features:
 * - Files expire in 1 day
 * - 100MB max file size
 * - Temporary file sharing
 * @param {Buffer} buffer - File buffer data
 * @returns {Promise<string>} - Returns the uploaded file URL
 */
const fileIO = async buffer => {
  try {
    // Detect file type and extension
    const { ext } = await fromBuffer(buffer) || {};
    
    // Create form data with file
    let form = new FormData();
    form.append('file', buffer, 'tmp.' + (ext || 'bin')); // Use 'bin' if no extension detected
    
    // Upload to file.io with 1 day expiry
    let res = await fetch('https://file.io/?expires=1d', {
      method: 'POST',
      body: form
    });
    
    let json = await res.json();
    
    // Check if upload was successful
    if (!json.success) throw new Error(json.message || 'Upload failed');
    
    return json.link;
  } catch (error) {
    throw new Error(`file.io upload failed: ${error.message}`);
  }
};

/**
 * Upload file to storage.restfulapi.my.id
 * Features:
 * - Permanent storage
 * - Supports multiple files
 * - No expiry date
 * @param {Buffer|ReadableStream|(Buffer|ReadableStream)[]} inp - File buffer/stream or array of them
 * @returns {Promise<string|string[]>} - Returns single URL or array of URLs
 */
const RESTfulAPI = async inp => {
  try {
    let form = new FormData();
    let buffers = inp;
    
    // Convert single input to array for uniform processing
    if (!Array.isArray(inp)) buffers = [inp];
    
    // Append all files to form data
    for (let buffer of buffers) {
      form.append('file', buffer);
    }
    
    // Upload to RESTful API storage
    let res = await fetch('https://storage.restfulapi.my.id/upload', {
      method: 'POST',
      body: form
    });
    
    let json = await res.text();
    
    try {
      json = JSON.parse(json);
      
      // Return single URL for single file, array for multiple files
      if (!Array.isArray(inp)) return json.files[0].url;
      return json.files.map(res => res.url);
      
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${json}`);
    }
  } catch (error) {
    throw new Error(`RESTful API upload failed: ${error.message}`);
  }
};

/**
 * Smart file uploader with fallback mechanism
 * Tries RESTful API first (permanent), then file.io (temporary) as backup
 * @param {Buffer|ReadableStream|(Buffer|ReadableStream)[]} inp - File input
 * @returns {Promise<string|string[]>} - Upload URL(s)
 */
async function smartUpload(inp) {
  let lastError = null;
  
  // Try each upload service in order
  for (let upload of [RESTfulAPI, fileIO]) {
    try {
      return await upload(inp);
    } catch (error) {
      lastError = error;
      console.log(`Upload service failed, trying next: ${error.message}`);
    }
  }
  
  // If all services failed, throw the last error
  if (lastError) throw lastError;
}

// ==================== COMMAND FUNCTIONS ====================

/**
 * Upload any file type with smart fallback
 * Usage: Reply to any file/media with "upload" or send with caption "upload"
 * Supports: Images, videos, documents, audio, etc.
 */
export default async function upload(sock, msg, from, args) {
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
        fileName = message.imageMessage.caption || 'image';
      } else if (message.videoMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'video';
        fileName = message.videoMessage.caption || 'video';
      } else if (message.audioMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'audio';
        fileName = 'audio';
      } else if (message.documentMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'document';
        fileName = message.documentMessage.fileName || 'document';
      } else if (message.stickerMessage) {
        mediaBuffer = await sock.downloadMediaMessage(quoted);
        mediaType = 'sticker';
        fileName = 'sticker';
      }
    }
    
    // Check current message for media
    if (!mediaBuffer && msg.message) {
      const message = msg.message;
      
      if (message.imageMessage) {
        mediaBuffer = await sock.downloadMediaMessage(msg);
        mediaType = 'image';
        fileName = message.imageMessage.caption || 'image';
      } else if (message.videoMessage) {
        mediaBuffer = await sock.downloadMediaMessage(msg);
        mediaType = 'video';
        fileName = message.videoMessage.caption || 'video';
      } else if (message.audioMessage) {
        mediaBuffer = await sock.downloadMediaMessage(msg);
        mediaType = 'audio';
        fileName = 'audio';
      } else if (message.documentMessage) {
        mediaBuffer = await sock.downloadMediaMessage(msg);
        mediaType = 'document';
        fileName = message.documentMessage.fileName || 'document';
      }
    }
    
    // If no media found, send usage instructions
    if (!mediaBuffer) {
      await sock.sendMessage(from, { 
        text: '📤 *Universal File Uploader*\n\n' +
              '❌ No file detected!\n\n' +
              '*How to use:*\n' +
              '1️⃣ Reply to any file with "upload"\n' +
              '2️⃣ Send any file with caption "upload"\n\n' +
              '*Supported files:*\n' +
              '• 📸 Images (JPG, PNG, GIF, etc.)\n' +
              '• 🎥 Videos (MP4, AVI, MOV, etc.)\n' +
              '• 🎵 Audio (MP3, WAV, OGG, etc.)\n' +
              '• 📄 Documents (PDF, DOC, TXT, etc.)\n' +
              '• 🎭 Stickers\n' +
              '• 📁 Any other file type\n\n' +
              '*Features:*\n' +
              '• Smart fallback (2 services)\n' +
              '• Permanent & temporary options\n' +
              '• Up to 100MB file size'
      });
      return;
    }

    // Get file size information
    const fileSizeKB = Math.round(mediaBuffer.length / 1024);
    const fileSizeMB = (fileSizeKB / 1024).toFixed(2);
    
    // Check file size limit (100MB)
    if (mediaBuffer.length > 100 * 1024 * 1024) {
      await sock.sendMessage(from, { 
        text: '❌ *File Too Large*\n\n' +
              `📦 Your file: ${fileSizeMB} MB\n` +
              `📏 Maximum: 100 MB\n\n` +
              '💡 *Tip:* Compress your file and try again!'
      });
      return;
    }

    // Send processing message
    await sock.sendMessage(from, { 
      text: `⏳ *Uploading ${mediaType}...*\n\n` +
            `📄 File: ${fileName}\n` +
            `📦 Size: ${fileSizeMB} MB\n` +
            `🔄 Trying multiple services...`
    });

    // Upload the file using smart upload
    const fileUrl = await smartUpload(mediaBuffer);
    
    // Determine which service was used based on URL
    let serviceName = 'Unknown';
    let serviceType = 'Permanent';
    
    if (fileUrl.includes('file.io')) {
      serviceName = 'file.io';
      serviceType = 'Temporary (1 day)';
    } else if (fileUrl.includes('restfulapi.my.id')) {
      serviceName = 'RESTful API';
      serviceType = 'Permanent';
    }
    
    // Send success response
    const response = `✅ *Upload Successful!*\n\n` +
                     `📄 *File:* ${fileName}\n` +
                     `📊 *Type:* ${mediaType.toUpperCase()}\n` +
                     `📦 *Size:* ${fileSizeMB} MB\n` +
                     `🌐 *Service:* ${serviceName}\n` +
                     `⏰ *Storage:* ${serviceType}\n\n` +
                     `🔗 *Direct Link:*\n${fileUrl}\n\n` +
                     `💡 *Tip:* Save this link to access your file anytime!`;

    await sock.sendMessage(from, { 
      text: response,
      contextInfo: {
        externalAdReply: {
          title: `${mediaType.toUpperCase()} Upload Complete`,
          body: `${fileName} • ${fileSizeMB} MB • ${serviceName}`,
          thumbnailUrl: mediaType === 'image' ? fileUrl : undefined,
          mediaType: 1,
          showAdAttribution: false,
          sourceUrl: fileUrl
        }
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    await sock.sendMessage(from, { 
      text: `❌ *Upload Failed*\n\n` +
            `*Error:* ${error.message}\n\n` +
            `*Possible causes:*\n` +
            `• File too large (>100MB)\n` +
            `• Unsupported file type\n` +
            `• Server temporarily down\n` +
            `• Network connection issues\n\n` +
            `*Solutions:*\n` +
            `• Try a smaller file\n` +
            `• Check your internet connection\n` +
            `• Try again in a few minutes`
    });
  }
}

upload.description = "Upload any file with smart fallback";
upload.emoji = "📤";

/**
 * Upload to specific service (file.io - temporary)
 * Usage: tempup (reply to file)
 */
export async function tempup(sock, msg, from, args) {
  try {
    let quoted = msg.quoted;
    if (!quoted || !quoted.message) {
      await sock.sendMessage(from, { 
        text: '📤 *Temporary File Upload*\n\n' +
              '❌ Please reply to a file!\n\n' +
              '*Features:*\n' +
              '• Files expire in 1 day\n' +
              '• 100MB max size\n' +
              '• Perfect for temporary sharing'
      });
      return;
    }

    await sock.sendMessage(from, { text: '⏳ Uploading to temporary storage (file.io)...' });

    const mediaBuffer = await sock.downloadMediaMessage(quoted);
    const fileUrl = await fileIO(mediaBuffer);
    
    const fileSizeMB = (mediaBuffer.length / (1024 * 1024)).toFixed(2);
    
    await sock.sendMessage(from, { 
      text: `✅ *Temporary Upload Complete!*\n\n` +
            `📦 Size: ${fileSizeMB} MB\n` +
            `⏰ Expires: 1 day\n` +
            `🌐 Service: file.io\n\n` +
            `🔗 *Link:* ${fileUrl}\n\n` +
            `⚠️ *Warning:* This link will expire in 24 hours!`
    });

  } catch (error) {
    await sock.sendMessage(from, { text: `❌ Temporary upload failed: ${error.message}` });
  }
}

tempup.description = "Upload to temporary storage (1 day expiry)";
tempup.emoji = "⏰";

/**
 * Upload to specific service (RESTful API - permanent)
 * Usage: permup (reply to file)
 */
export async function permup(sock, msg, from, args) {
  try {
    let quoted = msg.quoted;
    if (!quoted || !quoted.message) {
      await sock.sendMessage(from, { 
        text: '📤 *Permanent File Upload*\n\n' +
              '❌ Please reply to a file!\n\n' +
              '*Features:*\n' +
              '• Files stored permanently\n' +
              '• No expiry date\n' +
              '• Perfect for long-term storage'
      });
      return;
    }

    await sock.sendMessage(from, { text: '⏳ Uploading to permanent storage (RESTful API)...' });

    const mediaBuffer = await sock.downloadMediaMessage(quoted);
    const fileUrl = await RESTfulAPI(mediaBuffer);
    
    const fileSizeMB = (mediaBuffer.length / (1024 * 1024)).toFixed(2);
    
    await sock.sendMessage(from, { 
      text: `✅ *Permanent Upload Complete!*\n\n` +
            `📦 Size: ${fileSizeMB} MB\n` +
            `⏰ Expires: Never\n` +
            `🌐 Service: RESTful API\n\n` +
            `🔗 *Link:* ${fileUrl}\n\n` +
            `💾 *Note:* This file is stored permanently!`
    });

  } catch (error) {
    await sock.sendMessage(from, { text: `❌ Permanent upload failed: ${error.message}` });
  }
}

permup.description = "Upload to permanent storage (no expiry)";
permup.emoji = "💾";

// Export functions for external use
export { fileIO, RESTfulAPI, smartUpload };