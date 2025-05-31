import ytSearch from 'yt-search';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const youtube = async (sock, msg, from, args) => {
    try {
        if (!args[0]) {
            return await sock.sendMessage(from, { 
                text: '📽️ *YouTube Search & Download*\n\n' +
                      '*Search:* !youtube search [query]\n' +
                      '*Download:* !youtube download [URL or query]\n\n' +
                      'Example: *!youtube search never gonna give you up*\n' +
                      'Example: *!youtube download https://youtube.com/watch?v=...*'
            }, { quoted: msg });
        }

        const command = args[0].toLowerCase();
        const query = args.slice(1).join(' ');

        if (command === 'search') {
            await handleSearch(sock, msg, from, query);
        } else if (command === 'download') {
            await handleDownload(sock, msg, from, query);
        } else {
            // Default to search if no command specified
            const fullQuery = args.join(' ');
            await handleSearch(sock, msg, from, fullQuery);
        }

    } catch (error) {
        console.error("Error in youtube command:", error);
        await sock.sendMessage(from, { 
            text: '❌ An error occurred while processing your request.' 
        }, { quoted: msg });
    }
};

const handleSearch = async (sock, msg, from, query) => {
    if (!query) {
        return await sock.sendMessage(from, { 
            text: '📽️ Please provide a search query.\n\nExample: *!youtube search never gonna give you up*' 
        }, { quoted: msg });
    }

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
              `📺 *Other Results:*\n${resultsText}\n\n` +
              `💾 *To download:* !youtube download ${topResult.url}`
    }, { quoted: msg });
};

const handleDownload = async (sock, msg, from, input) => {
    if (!input) {
        return await sock.sendMessage(from, { 
            text: '📥 Please provide a YouTube URL or search query to download.\n\nExample: *!youtube download https://youtube.com/watch?v=...*' 
        }, { quoted: msg });
    }

    // Send initial message
    await sock.sendMessage(from, { 
        text: '⏳ Starting download... This may take a moment.' 
    }, { quoted: msg });

    try {
        let videoUrl = input;
        
        // If input is not a URL, search for it first
        if (!input.includes('youtube.com') && !input.includes('youtu.be')) {
            const searchResults = await ytSearch(input);
            if (!searchResults.videos.length) {
                return await sock.sendMessage(from, { 
                    text: '❌ No videos found for your search query.' 
                }, { quoted: msg });
            }
            videoUrl = searchResults.videos[0].url;
            
            await sock.sendMessage(from, { 
                text: `🎯 Found: ${searchResults.videos[0].title}\n⏳ Downloading...` 
            }, { quoted: msg });
        }

        // Create downloads directory if it doesn't exist
        const downloadDir = './downloads';
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        // Download with yt-dlp (audio only for faster download and smaller file size)
        const command = `yt-dlp -f "bestaudio[ext=m4a]/best[ext=mp4]/best" --extract-audio --audio-format mp3 --audio-quality 192K -o "${downloadDir}/%(title)s.%(ext)s" "${videoUrl}"`;
        
        const { stdout, stderr } = await execAsync(command);
        
        // Find the downloaded file
        const files = fs.readdirSync(downloadDir);
        const audioFile = files.find(file => file.endsWith('.mp3') || file.endsWith('.m4a'));
        
        if (audioFile) {
            const filePath = path.join(downloadDir, audioFile);
            const fileStats = fs.statSync(filePath);
            const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
            
            // Check file size (most messaging platforms have limits)
            if (fileStats.size > 50 * 1024 * 1024) { // 50MB limit
                await sock.sendMessage(from, { 
                    text: `✅ Download completed!\n📁 File: ${audioFile}\n📏 Size: ${fileSizeMB}MB\n\n❌ File too large to send (>50MB). You can find it in the downloads folder.`
                }, { quoted: msg });
            } else {
                // Send the audio file
                await sock.sendMessage(from, {
                    audio: { url: filePath },
                    mimetype: 'audio/mpeg',
                    fileName: audioFile,
                    caption: `🎵 Downloaded: ${audioFile.replace('.mp3', '').replace('.m4a', '')}`
                }, { quoted: msg });
            }
            
            // Optional: Clean up file after sending
            // fs.unlinkSync(filePath);
            
        } else {
            await sock.sendMessage(from, { 
                text: '❌ Download completed but file not found. Please check the downloads folder.' 
            }, { quoted: msg });
        }

    } catch (error) {
        console.error("Download error:", error);
        await sock.sendMessage(from, { 
            text: `❌ Download failed: ${error.message}` 
        }, { quoted: msg });
    }
};

youtube.description = "Search and download YouTube videos/audio";
youtube.category = "Media";

export default youtube;