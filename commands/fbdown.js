import axios from 'axios';
export default async function fbdown(sock, msg, from) {
    const videoUrl = msg.body.replace(/^\/fbdown\s*/i, '').trim();

    if (!videoUrl) {
        await sock.sendMessage(from, { text: 'Please provide a Facebook video URL. Example: /fbdown https://www.facebook.com/share/v/15fNp5gHK4/' });
        return;
    }
    
    if (!videoUrl.includes('facebook.com/')) {
        await sock.sendMessage(from, { text: 'That does not look like a valid Facebook URL. Please provide a full Facebook video link.' });
        return;
    }

    // Removed: await sock.sendMessage(from, { text: WARNING_MESSAGE });
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    await sock.sendMessage(from, { text: `Downloading Facebook video from "${videoUrl}"...` });

    try {
        const apiUrl = `https://apis.davidcyriltech.my.id/facebook?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.success && data.result && (data.result.downloads.sd || data.result.downloads.hd)) {
            const result = data.result;
            let formattedResponse = `**${result.title || 'Unknown Facebook Video'}**\n`;
            if (result.downloads.hd) {
                formattedResponse += `HD Quality (${result.downloads.hd.size}): ${result.downloads.hd.url}\n`;
            }
            if (result.downloads.sd) {
                formattedResponse += `SD Quality (${result.downloads.sd.size}): ${result.downloads.sd.url}\n`;
            }
            formattedResponse += `\n_Creator: pease ernest_`;
            await sock.sendMessage(from, { text: formattedResponse });
        } else {
            await sock.sendMessage(from, { text: `Could not download Facebook video from "${videoUrl}". The video might be private or the service is unavailable.` });
        }
    } catch (error) {
        console.error('Error in /fbdown command:', error);
        await sock.sendMessage(from, { text: 'An error occurred while trying to download the Facebook video. Please ensure the URL is valid and try again later.' });
    }
}

fbdown.description = "Downloads a Facebook video.";
fbdown.emoji = "📘";
fbdown.category = "Downloader";