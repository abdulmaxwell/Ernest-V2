import axios from 'axios';

// Utility function to clean HTML
const clean = (text) => text.replace(/(<br?\s?\/>)/gi, " \n").replace(/(<([^>]+)>)/gi, '');

// Core TikTok download function
async function downloadTikTok(url) {
    try {
        const response = await axios("https://lovetik.com/api/ajax/search", {
            'method': 'post',
            'data': new URLSearchParams(Object.entries({
                'query': url
            }))
        });
        
        return {
            "title": clean(response.data.desc),
            "author": clean(response.data.author),
            "nowm": response.data.links?.[0]?.a || url,
            "watermark": response.data.links?.[1]?.a || url,
            "audio": response.data.links?.[2]?.a || url,
            "thumbnail": response.data.cover || url
        };
    } catch (error) {
        throw error;
    }
}

// Main command function
export default async function tiktok(sock, msg, from) {
    try {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const url = text.split(' ')[1];
        
        if (!url || !url.includes('tiktok')) {
            await sock.sendMessage(from, { 
                text: '🎵 Usage: tiktok <tiktok_url>\n\nExample: tiktok https://vm.tiktok.com/...' 
            });
            return;
        }

        await sock.sendMessage(from, { text: '🎵 Downloading TikTok video...' });
        
        const result = await downloadTikTok(url);
        
        let caption = `🎵 TikTok Video\n\n`;
        caption += `Title: ${result.title || 'No title'}\n`;
        caption += `Author: ${result.author || 'Unknown'}`;
        
        // Try to send video without watermark first
        try {
            await sock.sendMessage(from, { 
                video: { url: result.nowm }, 
                caption: caption 
            });
        } catch (videoError) {
            // If no watermark version fails, try with watermark
            try {
                await sock.sendMessage(from, { 
                    video: { url: result.watermark }, 
                    caption: caption + '\n\n⚠️ With watermark' 
                });
            } catch (fallbackError) {
                // If both fail, send audio only
                await sock.sendMessage(from, { 
                    audio: { url: result.audio }, 
                    mimetype: 'audio/mpeg',
                    caption: caption + '\n\n🎵 Audio only' 
                });
            }
        }
    } catch (error) {
        console.error('TikTok error:', error);
        await sock.sendMessage(from, { text: '❌ Failed to download TikTok video. Please check the URL.' });
    }
}

tiktok.description = "Download TikTok videos";
tiktok.emoji = "🎵";