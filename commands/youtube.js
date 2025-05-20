import ytSearch from 'yt-search';

const youtube = async (sock, msg, from, args) => {
    try {
        if (!args[0]) {
            return await sock.sendMessage(from, { 
                text: '📽️ Please provide a search query.\n\nExample: *!youtube never gonna give you up*' 
            }, { quoted: msg });
        }

        const query = args.join(' ');
        const searchResults = await ytSearch(query);

        if (!searchResults.videos.length) {
            return await sock.sendMessage(from, { 
                text: '❌ No results found for your search.' 
            }, { quoted: msg });
        }

        const topResult = searchResults.videos[0];
        const resultsText = searchResults.videos.slice(0, 5).map((video, i) => 
            `*${i + 1}.* ${video.title}\n⏱️ ${video.timestamp} | 👀 ${video.views.toLocaleString()} views\n🔗 ${video.url}`
        ).join('\n\n');

        await sock.sendMessage(from, { 
            text: `🔍 *YouTube Search Results for:* "${query}"\n\n` +
                  `🎯 *Top Result:*\n${topResult.title}\n⏱️ ${topResult.timestamp} | 👀 ${topResult.views.toLocaleString()} views\n🔗 ${topResult.url}\n\n` +
                  `📺 *Other Results:*\n${resultsText}`
        }, { quoted: msg });

    } catch (error) {
        console.error("Error in youtube command:", error);
        await sock.sendMessage(from, { 
            text: '❌ An error occurred while searching YouTube.' 
        }, { quoted: msg });
    }
};

youtube.description = "Search YouTube videos - returns top 5 results";
youtube.category = "Media";

export default youtube;
// works