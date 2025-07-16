
import axios from 'axios';
export default async function apk(sock, msg, from) {
    const appName = msg.body.replace(/^\/apk\s*/i, '').trim();

    if (!appName) {
        await sock.sendMessage(from, { text: 'Please provide an app name to search for. Example: /apk whatsapp' });
        return;
    }

    // Removed: await sock.sendMessage(from, { text: WARNING_MESSAGE });
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

    await sock.sendMessage(from, { text: `Searching for "${appName}" APK...` });

    try {
        const apiUrl = `https://apis.davidcyriltech.my.id/download/apk?text=${encodeURIComponent(appName)}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.success && data.download_link) {
            const formattedResponse = `**${data.apk_name || appName}**\n` +
                                      `*Thumbnail: ${data.thumbnail || 'N/A'}*\n` +
                                      `Download Link: ${data.download_link}\n\n` +
                                      `_Creator: pease ernest_`;
            await sock.sendMessage(from, { text: formattedResponse });
        } else {
            await sock.sendMessage(from, { text: `Could not find APK for "${appName}". Please try a different name or check spelling.` });
        }
    } catch (error) {
        console.error('Error in /apk command:', error);
        await sock.sendMessage(from, { text: 'An error occurred while trying to find the APK. The service might be temporarily unavailable.' });
    }
}

apk.description = "Finds and provides direct download links for APKs.";
apk.emoji = "📱";
apk.category = "Utility";