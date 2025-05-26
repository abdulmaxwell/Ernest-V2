export default async function smi(sock, msg, from, args) {
    try {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isSticker = msg.message?.stickerMessage || quotedMsg?.stickerMessage;
        
        if (!isSticker) {
            return sock.sendMessage(from, { text: 'Please send or quote a sticker to convert to image' });
        }

        const media = msg.message?.stickerMessage || quotedMsg?.stickerMessage;
        const stream = await sock.downloadMedia(media);
        const buffer = Buffer.from(await stream.toArrayBuffer());

        await sock.sendMessage(from, {
            image: buffer,
            mimetype: 'image/webp',
            caption: 'Here\'s your image from sticker'
        });
        
    } catch (error) {
        console.error('Error in smi command:', error);
        await sock.sendMessage(from, { 
            text: 'Failed to convert sticker to image. This sticker format may not be supported.'
        });
    }
}

export const description = "Converts stickers back to images";
export const category = "Media";