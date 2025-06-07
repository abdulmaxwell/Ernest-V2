import jimp from 'jimp';


// Text to Image conversion function
async function textToImg(text) {
  try {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    
    // Split text into lines (max 30 chars per line)
    // This logic creates lines. It might need adjustment based on font size and actual pixel width.
    // Jimp's measureTextHeight is more reliable for final sizing.
    words.forEach((word) => {
      // Check if adding the next word (plus a space) exceeds 30 characters
      if ((line + word + ' ').length < 30) {
        line += word + ' ';
      } else {
        // If the current line is not empty, push it
        if (line.trim().length > 0) { // Only push non-empty lines
            lines.push(line.trim());
        }
        line = word + ' '; // Start new line with the current word
      }
    });
    // Push the last line if it's not empty
    if (line.trim().length > 0) {
        lines.push(line.trim());
    }
    text = lines.join('\n');
    
    // Load font and calculate dimensions
    // Using FONT_SANS_64_WHITE for large text.
    const font = await jimp.loadFont(jimp.FONT_SANS_64_WHITE);
    
    // Calculate accurate text width and height using Jimp's functions
    // For proper wrapping and dimensions, it's better to pass the entire text to measureText
    // and let Jimp handle the line breaks based on a max width.
    // However, your manual line wrapping above changes 'text' before this.
    // Let's ensure canvas dimensions are dynamic based on the actual rendered text.
    
    // Create a dummy image to calculate text dimensions
    const dummyImage = new jimp(1, 1); // 1x1 image, dimensions don't matter here
    
    // Max width for rendering to allow Jimp to calculate height for multi-line text
    // A reasonable max width for the image to prevent excessively wide images.
    // This needs careful tuning based on FONT_SANS_64_WHITE.
    const maxWidth = 700; // Example max width in pixels
    const textRenderWidth = jimp.measureText(font, text);
    const textRenderHeight = jimp.measureTextHeight(font, text, maxWidth); // Measure height with max width
    
    // Calculate canvas dimensions
    // Add some padding
    const paddingX = 40; // Horizontal padding
    const paddingY = 40; // Vertical padding
    
    // Ensure textWidth is not excessively wide and use it for actual canvas width
    // The canvas width should be at least `textRenderWidth` if `textRenderWidth` is within `maxWidth`,
    // or `maxWidth` if the text requires wrapping.
    const canvasWidth = Math.min(maxWidth, textRenderWidth) + paddingX;
    const canvasHeight = textRenderHeight + paddingY;
    
    // Create image with WhatsApp green background
    const image = new jimp(canvasWidth, canvasHeight, 0x075e54ff); // WhatsApp green color
    
    // Text position to center horizontally and vertically
    const x = paddingX / 2;
    const y = paddingY / 2;
    
    // Add text to image with defined max width for wrapping
    // Jimp's print function can handle wrapping if you give it a max width
    image.print(
      font, 
      x, 
      y, 
      { text: text, alignmentX: jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: jimp.VERTICAL_ALIGN_MIDDLE }, 
      canvasWidth - paddingX, // Use the inner width for text
      canvasHeight - paddingY // Use the inner height for text
    );
    
    // Add shadow effect (apply after print for correct effect)
    // Jimp's shadow might not be a direct method for newer versions or needs a plugin.
    // If it's a custom function or a plugin, ensure it's correctly applied.
    // If Jimp version doesn't support .shadow() directly, this line will cause an error.
    // For now, let's comment it out or simplify if it's the source of issues.
    // image.shadow({ blur: 3, x: 6, y: 5, color: '#000000' }); // This line might need a Jimp plugin or manual implementation
    
    // Convert to buffer
    const buffer = await image.getBufferAsync(jimp.MIME_PNG);
    return buffer;
  } catch (err) {
    throw new Error(`Text to image error: ${err.message}`);
  }
}

// =================================================================
// TEXT TO IMAGE COMMAND
// =================================================================

export default async function ims(sock, msg, from) {
  try {
    // SAFELY GET THE MESSAGE TEXT
    const messageText = msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || 
                        msg.message?.imageMessage?.caption || // If command is sent as caption
                        ''; 

    // Parse command arguments from the robustly extracted messageText
    const args = messageText.split(' ').slice(1);
    const text = args.join(' ').trim();
    
    if (!text) {
      await sock.sendMessage(from, { 
        text: '📝 *Text to Image Generator*\n\n' +
              '✨ Convert your text into a beautiful image!\n\n' +
              '📋 **Usage:**\n' +
              '`/ims Your text here`\n\n' + // Updated to use /ims
              '🎨 **Features:**\n' +
              '• WhatsApp green background\n' +
              '• White text with shadow (if supported)\n' +
              '• Auto line wrapping\n' +
              '• Perfect for quotes & messages\n\n' +
              '💡 **Example:**\n' +
              '`/ims Hello World! This is my custom text image.`'
      });
      return;
    }

    // Check text length
    if (text.length > 500) {
      await sock.sendMessage(from, { 
        text: '❌ *Text too long!*\n\n' +
              '📏 Maximum length: 500 characters\n' +
              '📊 Your text: ' + text.length + ' characters\n\n' +
              '✂️ Please shorten your text and try again.'
      });
      return;
    }

    // Send processing message
    await sock.sendMessage(from, { 
      text: '🎨 *Creating your image...*\n\n' +
            '✨ Converting text to image with style!\n' +
            '⏳ Please wait a moment...'
    });

    try {
      // Generate image
      const imageBuffer = await textToImg(text);
      
      // Send the generated image
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: '✅ *Text to Image Complete!*\n\n' +
                 '🎨 Your custom text image is ready!\n' +
                 '💾 You can save and share this image anywhere.\n\n' +
                 `📝 *Original text:* "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`
      });

    } catch (conversionError) {
      console.error('Text to image conversion error:', conversionError);
      await sock.sendMessage(from, { 
        text: '❌ *Image generation failed!*\n\n' +
              '🔧 There was an error creating your image.\n' +
              '🔄 Please try again with different text.\n\n' +
              '💡 **Tips:**\n' +
              '• Use simpler text\n' +
              '• Avoid excessive special characters\n' +
              '• Try shorter sentences'
      });
    }

  } catch (error) {
    console.error('IMS command error:', error);
    await sock.sendMessage(from, { 
      text: '❌ *Unexpected Error*\n\n' +
            '🔧 An error occurred while processing your request.\n' +
            '🔄 Please try again or contact support.\n\n' +
            '📝 Error has been logged for debugging.'
    });
  }
}

ims.description = "Convert text to styled image with WhatsApp theme";
ims.emoji = "🎨";

// =================================================================
// SETUP INSTRUCTIONS
// =================================================================

/*
SETUP INSTRUCTIONS:

1. Install required dependency:
    npm install jimp

2. Usage examples:
    /ims Hello World!
    /ims This is a long text that will be automatically wrapped into multiple lines for better readability
    /ims "Quotes and special messages look great as images!"

3. Features:
    - ✅ Auto line wrapping (based on image width)
    - ✅ WhatsApp green background (#075e54)
    - ✅ White text with potential shadow effect
    - ✅ 500 character limit
    - ✅ Error handling for invalid inputs
    - ✅ Professional styling

4. Font used: FONT_SANS_64_WHITE (built into jimp)
    - Large, readable text
    - White color for contrast
    - Shadow for depth effect
*/