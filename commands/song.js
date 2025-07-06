const axios = require('axios');

export default async function song(sock, msg, from) {
    const songQuery = msg.body.replace(/^\/song\s*/i, '').trim();

    if (!songQuery) {
        await sock.sendMessage(from, { text: 'Please provide a song name to search for. Example: /song Faded' });
        return;
    }

    // Removed: await sock.sendMessage(from, { text: WARNING_MESSAGE });
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    await sock.sendMessage(from, { text: `Searching for song "${songQuery}"...` });

    try {
        const apiUrl = `https://apis.davidcyriltech.my.id/song?query=${encodeURIComponent(songQuery)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.status && data.result && data.result.audio && data.result.audio.download_url) {
            const result = data.result;
            const formattedResponse = `**${result.title || songQuery}**\n` +
                                      `Video URL: ${result.video_url || 'N/A'}\n` +
                                      `*Thumbnail: ${result.thumbnail || 'N/A'}*\n` +
                                      `Duration: ${result.duration || 'N/A'}\n` +
                                      `Views: ${result.views ? result.views.toLocaleString() : 'N/A'}\n` +
                                      `Published: ${result.published || 'N/A'}\n\n` +
                                      `Audio Download (${result.audio.quality || 'N/A'}): ${result.audio.download_url}\n` +
                                      (result.video && result.video.download_url ? `Video Download (${result.video.quality || 'N/A'}): ${result.video.download_url}\n` : '') +
                                      `\n_Creator: pease ernest_`;
            await sock.sendMessage(from, { text: formattedResponse });
        } else {
            await sock.sendMessage(from, { text: `Could not find song "${songQuery}". The service might not have it or is unavailable.` });
        }
    } catch (error) {
        console.error('Error in /song command:', error);
        await sock.sendMessage(from, { text: 'An error occurred while trying to find the song. Please try again later.' });
    }
}

song.description = "Downloads a song (audio and video options).";
song.emoji = "🎵";
song.category = "Downloader";