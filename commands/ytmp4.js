import axios from 'axios';

export default async function ytmp4(sock, msg, from) {
    const videoUrl = msg.body.replace(/^\/ytmp4\s*/i, '').trim();

    if (!videoUrl) {
        await sock.sendMessage(from, { text: 'Please provide a YouTube video URL. Example: /ytmp4 https://youtube.com/watch?v=q0hyYWKXF0Q' });
        return;
    }
    
    // Basic URL validation
    if (!videoUrl.includes('youtube.com/') && !videoUrl.includes('youtu.be/')) {
        await sock.sendMessage(from, { text: 'That does not look like a valid YouTube URL. Please provide a full YouTube video link.' });
        return;
    }

    // Removed: await sock.sendMessage(from, { text: WARNING_MESSAGE });
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    await sock.sendMessage(from, { text: `Downloading YouTube MP4 from "${videoUrl}"...` });

    try {
        const apiUrl = `https://apis.davidcyriltech.my.id/youtube/mp4?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.status && data.result && data.result.url) {
            const formattedResponse = `**${data.result.title || 'Unknown Title'}**\n` +
                                      `*Thumbnail: ${data.result.thumbnail || 'N/A'}*\n` +
                                      `Download Link: ${data.result.url}\n\n` +
                                      `_Creator: pease ernest_`;
            await sock.sendMessage(from, { text: formattedResponse });
        } else {
            await sock.sendMessage(from, { text: `Could not download MP4 from "${videoUrl}". The video might be private, restricted, or the service is unavailable.` });
        }
    } catch (error) {
        console.error('Error in /ytmp4 command:', error);
        await sock.sendMessage(from, { text: 'An error occurred while trying to download the YouTube video. Please ensure the URL is valid and try again later.' });
    }
}

ytmp4.description = "Downloads a YouTube video as an MP4.";
ytmp4.emoji = "▶️";
ytmp4.category = "Downloader";