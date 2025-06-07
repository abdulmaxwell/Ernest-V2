import jimp from 'jimp';
import jsQR from 'jsqr';


/**
 * Reads a QR code from an image buffer.
 * @param {Buffer} imageBuffer - The image buffer containing the QR code.
 * @returns {string|null} The decoded QR code data, or null if no QR code was found.
 */
async function readQr(imageBuffer) {
  try {
    const image = await jimp.read(imageBuffer);
    const { data, width, height } = image.bitmap;
    const code = jsQR(data, width, height);
    
    if (code) {
      return code.data;
    }
  } catch (err) {
    throw new Error(`Error reading QR code: ${err.message}`);
  }
  return null;
}

// Helper function to detect QR code type
function detectQRType(data) {
  if (data.startsWith('http://') || data.startsWith('https://')) {
    return { type: '🌐 Website URL', icon: '🔗' };
  } else if (data.startsWith('mailto:')) {
    return { type: '📧 Email Address', icon: '✉️' };
  } else if (data.startsWith('tel:')) {
    return { type: '📞 Phone Number', icon: '☎️' };
  } else if (data.startsWith('sms:')) {
    return { type: '💬 SMS Message', icon: '📱' };
  } else if (data.startsWith('wifi:')) {
    return { type: '📶 WiFi Network', icon: '🔐' };
  } else if (data.includes('@') && data.includes('.')) {
    return { type: '📧 Email Address', icon: '✉️' };
  } else if (/^\+?[\d\s\-\(\)]+$/.test(data)) {
    return { type: '📞 Phone Number', icon: '☎️' };
  } else if (data.startsWith('BEGIN:VCARD')) {
    return { type: '👤 Contact Card', icon: '📇' };
  } else if (data.startsWith('BEGIN:VEVENT')) {
    return { type: '📅 Calendar Event', icon: '🗓️' };
  } else {
    return { type: '📝 Text Data', icon: '📄' };
  }
}

// Helper function to format QR content
function formatQRContent(data) {
  const qrInfo = detectQRType(data);
  
  let formattedContent = '';
  
  switch (qrInfo.type) {
    case '🌐 Website URL':
      formattedContent = `🔗 *URL:* ${data}`;
      break;
    case '📧 Email Address':
      if (data.startsWith('mailto:')) {
        const email = data.replace('mailto:', '');
        formattedContent = `✉️ *Email:* ${email}`;
      } else {
        formattedContent = `✉️ *Email:* ${data}`;
      }
      break;
    case '📞 Phone Number':
      if (data.startsWith('tel:')) {
        const phone = data.replace('tel:', '');
        formattedContent = `☎️ *Phone:* ${phone}`;
      } else {
        formattedContent = `☎️ *Phone:* ${data}`;
      }
      break;
    case '📶 WiFi Network':
      // Parse WiFi QR format: WIFI:T:WPA;S:NetworkName;P:Password;H:false;;
      const wifiMatch = data.match(/WIFI:T:([^;]*);S:([^;]*);P:([^;]*);/);
      if (wifiMatch) {
        formattedContent = `📶 *WiFi Network*\n` +
                          `🏷️ *Name:* ${wifiMatch[2]}\n` +
                          `🔐 *Security:* ${wifiMatch[1]}\n` +
                          `🗝️ *Password:* ${wifiMatch[3]}`;
      } else {
        formattedContent = `📶 *WiFi:* ${data}`;
      }
      break;
    case '👤 Contact Card':
      formattedContent = `📇 *Contact Card (vCard)*\n📋 Contains contact information`;
      break;
    case '📅 Calendar Event':
      formattedContent = `🗓️ *Calendar Event*\n📋 Contains event details`;
      break;
    default:
      formattedContent = `📄 *Text Content:*\n${data}`;
  }
  
  return { ...qrInfo, content: formattedContent };
}

// =================================================================
// QR CODE READER COMMAND
// =================================================================

export default async function qrread(sock, msg, from) {
  try {
    // Check if message has an image
    if (!msg.message?.imageMessage) {
      await sock.sendMessage(from, { 
        text: '📱 *QR Code Reader*\n\n' +
              '🔍 Scan and decode QR codes from images!\n\n' +
              '📋 **How to use:**\n' +
              '1. Send or forward an image with a QR code\n' +
              '2. Reply to that image with `qrread`\n' +
              '3. Get the decoded information instantly!\n\n' +
              '✨ **Supported QR types:**\n' +
              '🔗 Website URLs\n' +
              '📧 Email addresses\n' +
              '📞 Phone numbers\n' +
              '📶 WiFi credentials\n' +
              '👤 Contact cards\n' +
              '📅 Calendar events\n' +
              '📝 Plain text\n\n' +
              '💡 Make sure the QR code is clear and visible!'
      });
      return;
    }

    // Send processing message
    await sock.sendMessage(from, { 
      text: '🔍 *Scanning QR code...*\n\n' +
            '📱 Analyzing the image for QR codes\n' +
            '⏳ This will just take a moment...'
    });

    try {
      // Download the image
      const imageBuffer = await sock.downloadMediaMessage(msg);
      
      // Read QR code
      const qrData = await readQr(imageBuffer);
      
      if (!qrData) {
        await sock.sendMessage(from, { 
          text: '❌ *No QR code found!*\n\n' +
                '🔍 **Possible reasons:**\n' +
                '• No QR code in the image\n' +
                '• QR code is too blurry or small\n' +
                '• Image quality is too low\n' +
                '• QR code is damaged or incomplete\n\n' +
                '💡 **Tips for better results:**\n' +
                '• Use high-quality images\n' +
                '• Ensure good lighting\n' +
                '• Make sure QR code is fully visible\n' +
                '• Avoid tilted or distorted images'
        });
        return;
      }

      // Format the QR content
      const qrInfo = formatQRContent(qrData);
      
      // Send the decoded result
      await sock.sendMessage(from, {
        text: `✅ *QR Code Successfully Decoded!*\n\n` +
              `${qrInfo.icon} **Type:** ${qrInfo.type}\n\n` +
              `📋 **Content:**\n${qrInfo.content}\n\n` +
              `📏 **Length:** ${qrData.length} characters\n\n` +
              `🔒 **Raw Data:**\n\`\`\`${qrData}\`\`\``
      });

      // If it's a URL, offer to send it as a clickable link
      if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
        await sock.sendMessage(from, {
          text: `🔗 *Clickable Link:*\n${qrData}\n\n` +
                `💡 Tap the link above to open it directly!`
        });
      }

    } catch (readError) {
      console.error('QR code reading error:', readError);
      await sock.sendMessage(from, { 
        text: '❌ *Failed to read QR code!*\n\n' +
              '🔧 There was an error processing the image.\n' +
              '🔄 Please try with a different image.\n\n' +
              '💡 **Suggestions:**\n' +
              '• Use a clearer image\n' +
              '• Ensure the QR code is not rotated\n' +
              '• Try cropping to show only the QR code\n' +
              '• Check if the image format is supported'
      });
    }

  } catch (error) {
    console.error('QRRead command error:', error);
    await sock.sendMessage(from, { 
      text: '❌ *Unexpected Error*\n\n' +
            '🔧 An error occurred while processing your request.\n' +
            '🔄 Please try again or contact support.\n\n' +
            '📝 Error has been logged for debugging.'
    });
  }
}

qrread.description = "Read and decode QR codes from images";
qrread.emoji = "📱";

// =================================================================
// SETUP INSTRUCTIONS
// =================================================================

/*
SETUP INSTRUCTIONS:

1. Install required dependencies:
   npm install jimp jsqr

2. Usage:
   - Reply to any image containing a QR code with: qrread
   - The bot will scan and decode the QR code content

3. Features:
   - ✅ Detects multiple QR code types
   - ✅ Formats content based on type (URL, email, phone, etc.)
   - ✅ Shows both formatted and raw data
   - ✅ Provides helpful error messages
   - ✅ Special handling for WiFi QR codes
   - ✅ Clickable links for URLs
   - ✅ Contact card and calendar event detection

4. Supported QR code types:
   - Website URLs (http/https)
   - Email addresses (mailto: or plain email)
   - Phone numbers (tel: or plain numbers)
   - SMS messages (sms:)
   - WiFi credentials (WIFI: format)
   - Contact cards (vCard format)
   - Calendar events (vEvent format)
   - Plain text content

5. Error handling:
   - Invalid/corrupted images
   - No QR code found
   - Blurry or low-quality images
   - Network/processing errors
   npm install jimp jsqr
*/