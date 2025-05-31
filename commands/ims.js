import { Sticker, StickerTypes } from 'wa-sticker-formatter';

export default async function ims(sock, msg, from, args) {
    try {
        console.log("🖼️ Starting image to sticker conversion...");
        
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = msg.message?.imageMessage || quotedMsg?.imageMessage;
        
        if (!imageMessage) {
            console.log("❌ No image found");
            return sock.sendMessage(from, { 
                text: '❌ *Please send or reply to an image to convert to sticker*' 
            }, { quoted: msg });
        }

        console.log("📥 Downloading image...");
        
        const stream = await sock.downloadContentFromMessage(imageMessage, 'image');
        const chunks = [];
        
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        
        const buffer = Buffer.concat(chunks);
        console.log(`✅ Downloaded ${buffer.length} bytes`);

        if (buffer.length === 0) {
            throw new Error("Downloaded buffer is empty");
        }

        console.log("🔄 Converting to sticker...");
        
        const sticker = new Sticker(buffer, {
            pack: args.join(' ') || 'Ernest Bot',
            author: 'Ernest v2',
            type: StickerTypes.FULL,
            categories: ['🤖', '💫'],
            id: Date.now().toString(),
            quality: 50
        });

        const stickerBuffer = await sticker.toBuffer();
        
        console.log("📤 Sending sticker...");
        await sock.sendMessage(from, {
            sticker: stickerBuffer
        }, { quoted: msg });
        
        console.log("✅ Sticker sent successfully!");
        
    } catch (error) {
        console.error('❌ Error in ims command:', error);
        await sock.sendMessage(from, { 
            text: `❌ *Failed to convert image to sticker*\n\n_Error:_ ${error.message}`
        }, { quoted: msg });
    }
}

export const description = "Converts images to stickers with custom pack name";
export const category = "Media";

ims.description = description;
ims.category = category;