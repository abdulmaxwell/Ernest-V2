const axios = require('axios');

export default async function play(sock, msg, from) {
    const mediaQuery = msg.body.replace(/^\/play\s*/i, '').trim();

    if (!mediaQuery) {
        await sock.sendMessage(from, { text: 'Please provide a song or video name to play. Example: /play Faded' });
        return;
    }

    // Removed: await sock.sendMessage(from, { text: WARNING_MESSAGE });
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    await sock.sendMessage(from, { text: `Searching for "${mediaQuery}"...` });

    try {
        const apiUrl = `https://apis.davidcyriltech.my.id/play?query=${encodeURIComponent(mediaQuery)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.status && data.result && data.result.download_url) {
            const result = data.result;
            const formattedResponse = `**${result.title || mediaQuery}**\n` +
                                      `Video URL: ${result.video_url || 'N/A'}\n` +
                                      `*Thumbnail: ${result.thumbnail || 'N/A'}*\n` +
                                      `Duration: ${result.duration || 'N/A'}\n` +
                                      `Views: ${result.views ? result.views.toLocaleString() : 'N/A'}\n` +
                                      `Published: ${result.published || 'N/A'}\n` +
                                      `Download Link: ${result.download_url}\n\n` +
                                      `_Creator: pease ernest_`;
            await sock.sendMessage(from, { text: formattedResponse });
        } else {
            await sock.sendMessage(from, { text: `Could not find anything for "${mediaQuery}".` });
        }
    } catch (error) {
        console.error('Error in /play command:', error);
        await sock.sendMessage(from, { text: 'An error occurred while trying to find the media. Please try again later.' });
    }
}

play.description = "Finds a song or video to play (provides details and download link).";
play.emoji = "▶️";
play.category = "Downloader";