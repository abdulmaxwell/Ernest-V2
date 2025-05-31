export default async function smi(sock, msg, from, args) {
    try {
        console.log("🎭 Starting sticker to image conversion...");
        
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerMessage = msg.message?.stickerMessage || quotedMsg?.stickerMessage;
        
        if (!stickerMessage) {
            console.log("❌ No sticker found");
            return sock.sendMessage(from, { 
                text: '❌ *Please send or reply to a sticker to convert to image*' 
            }, { quoted: msg });
        }

        console.log("📥 Downloading sticker...");
        
        const stream = await sock.downloadContentFromMessage(stickerMessage, 'sticker');
        const chunks = [];
        
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        
        const buffer = Buffer.concat(chunks);
        console.log(`✅ Downloaded ${buffer.length} bytes`);

        if (buffer.length === 0) {
            throw new Error("Downloaded buffer is empty");
        }

        console.log("📤 Sending as image...");
        
        await sock.sendMessage(from, {
            image: buffer,
            caption: '🖼️ *Sticker converted to image by Ernest v2*'
        }, { quoted: msg });
        
        console.log("✅ Image sent successfully!");
        
    } catch (error) {
        console.error('❌ Error in smi command:', error);
        await sock.sendMessage(from, { 
            text: `❌ *Failed to convert sticker to image*\n\n_Error:_ ${error.message}`
        }, { quoted: msg });
    }
}

export const description = "Converts stickers back to images";
export const category = "Media";

smi.description = description;
smi.category = category;