import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { convertToSticker } from '../utils/mediaUtils';

export default async function ims(sock, msg, from, args) {
    try {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isImage = msg.message?.imageMessage || quotedMsg?.imageMessage;
        
        if (!isImage) {
            return sock.sendMessage(from, { text: 'Please send or quote an image to convert to sticker' });
        }

        const media = msg.message?.imageMessage || quotedMsg?.imageMessage;
        const stream = await sock.downloadMedia(media);
        const buffer = Buffer.from(await stream.toArrayBuffer());

        const stickerOptions = await convertToSticker(buffer);
        const sticker = new Sticker(buffer, stickerOptions);

        await sock.sendMessage(from, await sticker.toMessage());
        
    } catch (error) {
        console.error('Error in ims command:', error);
        await sock.sendMessage(from, { 
            text: 'Failed to convert image to sticker. Please try with a different image.'
        });
    }
}

export const description = "Converts images to stickers with Ernest pack";
export const category = "Media";