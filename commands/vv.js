const stealViewOnce = async (sock, msg, from) => {
  try {
    console.log("🔍 Checking for view-once message...");
    
    // Get the quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      console.log("❌ No quoted message found");
      return await sock.sendMessage(from, {
        text: "❌ *You need to reply to a view-once image or video message with this command.*",
      }, { quoted: msg });
    }

    console.log("📋 Quoted message keys:", Object.keys(quoted));

    // Check for different view-once message formats
    let viewOnceMessage = null;
    let mediaType = null;

    // Try different possible structures
    if (quoted.viewOnceMessageV2?.message) {
      viewOnceMessage = quoted.viewOnceMessageV2.message;
      console.log("✅ Found viewOnceMessageV2");
    } else if (quoted.viewOnceMessage?.message) {
      viewOnceMessage = quoted.viewOnceMessage.message;
      console.log("✅ Found viewOnceMessage");
    } else if (quoted.imageMessage?.viewOnce) {
      viewOnceMessage = { imageMessage: quoted.imageMessage };
      console.log("✅ Found direct imageMessage with viewOnce");
    } else if (quoted.videoMessage?.viewOnce) {
      viewOnceMessage = { videoMessage: quoted.videoMessage };
      console.log("✅ Found direct videoMessage with viewOnce");
    }

    if (!viewOnceMessage) {
      console.log("❌ No view-once content found");
      console.log("📋 Available message types:", Object.keys(quoted));
      return await sock.sendMessage(from, {
        text: "❌ *That message is not a view-once media.* Try again with a correct one.",
      }, { quoted: msg });
    }

    // Determine media type and get the message
    const messageKeys = Object.keys(viewOnceMessage);
    console.log("📋 View-once message keys:", messageKeys);

    if (viewOnceMessage.imageMessage) {
      mediaType = 'image';
    } else if (viewOnceMessage.videoMessage) {
      mediaType = 'video';
    } else {
      console.log("❌ Unknown media type in view-once message");
      return await sock.sendMessage(from, {
        text: "❌ *Unsupported view-once media type.*",
      }, { quoted: msg });
    }

    const mediaMessage = viewOnceMessage[`${mediaType}Message`];
    console.log(`📱 Processing ${mediaType} message...`);

    // Download the media
    console.log("⬇️ Downloading media content...");
    const stream = await sock.downloadContentFromMessage(mediaMessage, mediaType);
    
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    console.log(`✅ Downloaded ${buffer.length} bytes`);

    // Send the unlocked media
    const sendOptions = {
      [mediaType]: buffer,
      caption: "🔓 *View Once unlocked by Ernest v2*",
    };

    await sock.sendMessage(from, sendOptions, { quoted: msg });
    console.log("✅ View-once media sent successfully!");

  } catch (err) {
    console.error("❌ Error in stealViewOnce:", err);
    console.error("❌ Error stack:", err.stack);
    
    await sock.sendMessage(from, {
      text: "🚫 *Failed to fetch view-once media. Error details logged.*",
    }, { quoted: msg });
  }
};

stealViewOnce.description = "Unlock and resend view-once media (must reply to it).";
stealViewOnce.category = "Media";

export default stealViewOnce;