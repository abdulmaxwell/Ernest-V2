const stealViewOnce = async (sock, msg, from) => {
  try {
    // Make sure it's quoting a message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      return await sock.sendMessage(from, {
        text: "❌ *You need to reply to a view-once image or video message with this command.*",
      }, { quoted: msg });
    }

    const viewOnce = quoted?.viewOnceMessageV2?.message;
    if (!viewOnce) {
      return await sock.sendMessage(from, {
        text: "❌ *That message is not a view-once media.* Try again with a correct one.",
      }, { quoted: msg });
    }

    const type = Object.keys(viewOnce)[0]; // imageMessage or videoMessage
    const mediaMessage = viewOnce[type];

    const stream = await sock.downloadContentFromMessage(mediaMessage, type.includes('image') ? 'image' : 'video');
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    await sock.sendMessage(from, {
      [type.includes('image') ? 'image' : 'video']: buffer,
      caption: "🔓 *View Once unlocked by Ernest v2*",
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error in vv command:", err);
    await sock.sendMessage(from, {
      text: "🚫 *Failed to fetch view-once media. Maybe it's already been viewed or expired.*",
    }, { quoted: msg });
  }
};

stealViewOnce.description = "Unlock and resend view-once media (must reply to it).";
stealViewOnce.category = "Media";

export default stealViewOnce;

