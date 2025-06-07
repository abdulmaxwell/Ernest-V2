// YouTube Download Command for Bot
// Import required dependencies
import ytdl from 'youtubedl-core'
import yts from 'youtube-yts'
import readline from 'readline'
import ffmpeg from 'fluent-ffmpeg'
import NodeID3 from 'node-id3'
import fs from 'fs'
import * as ytM from 'node-youtube-music'
import { randomBytes } from 'crypto'
import https from 'https'
import http from 'http'

// YouTube URL validation regex
const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/

// Utility function to download images for album artwork
const fetchBuffer = (url) => {
    return new Promise((resolve, reject) => {
        if (!url) return reject(new Error('No URL provided'))
        
        const client = url.startsWith('https') ? https : http
        const request = client.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch image: HTTP ${response.statusCode}`))
                return
            }
            const chunks = []
            response.on('data', (chunk) => chunks.push(chunk))
            response.on('end', () => resolve({ buffer: Buffer.concat(chunks) }))
            response.on('error', (error) => reject(error))
        })
        request.on('error', (error) => reject(error))
        request.setTimeout(10000, () => {
            request.destroy()
            reject(new Error('Request timeout'))
        })
    })
}

// YouTube utility functions
const isYTUrl = (url) => ytIdRegex.test(url)
const getVideoID = (url) => {
    if (!isYTUrl(url)) throw new Error('Not a YouTube URL')
    return ytIdRegex.exec(url)[1]
}

// Function to write metadata tags to MP3 with fallback values
const writeTags = async (filePath, metadata) => {
    try {
        const tags = {
            title: metadata.Title || 'Unknown Title',
            artist: metadata.Artist || 'Unknown Artist',
            originalArtist: metadata.Artist || 'Unknown Artist',
            album: metadata.Album || 'Unknown Album',
            year: metadata.Year || new Date().getFullYear().toString()
        }

        // Only add image if available
        if (metadata.Image) {
            try {
                const imageData = await fetchBuffer(metadata.Image)
                tags.image = {
                    mime: 'jpeg',
                    type: { id: 3, name: 'front cover' },
                    imageBuffer: imageData.buffer,
                    description: `Cover of ${metadata.Title || 'Unknown Title'}`
                }
            } catch (imageError) {
                console.log('Failed to fetch image:', imageError.message)
            }
        }

        NodeID3.write(tags, filePath)
    } catch (error) {
        console.log('Error writing tags:', error.message)
    }
}

// Function to search for music tracks with error handling
const searchTrack = async (query) => {
    try {
        if (!query || typeof query !== 'string' || query.length < 2) {
            throw new Error('Invalid search query')
        }

        const ytMusic = await ytM.searchMusics(query)
        if (!ytMusic || ytMusic.length === 0) {
            throw new Error('No results found')
        }

        return ytMusic.map(track => ({
            isYtMusic: true,
            title: `${track.title || 'Unknown Title'} - ${track.artists?.map(x => x.name).join(' ') || 'Unknown Artist'}`,
            artist: track.artists?.map(x => x.name).join(' ') || 'Unknown Artist',
            id: track.youtubeId || '',
            url: 'https://youtu.be/' + (track.youtubeId || ''),
            album: track.album?.name || 'Unknown Album',
            duration: {
                seconds: track.duration?.totalSeconds || 0,
                label: track.duration?.label || '0:00'
            },
            image: track.thumbnailUrl?.replace('w120-h120', 'w600-h600') || ''
        }))
    } catch (error) {
        throw new Error('Search failed: ' + error.message)
    }
}

// Function to download music with metadata and proper cleanup
const downloadMusic = async (query, sock, from) => {
    let songPath = ''
    let stream = null

    try {
        // Validate input
        if (!query || typeof query !== 'string' || query.length < 2) {
            throw new Error('Invalid search query')
        }

        // Send searching message
        await sock.sendMessage(from, { text: '🔍 Searching for music...' })
        
        const tracks = await searchTrack(query)
        if (!tracks || tracks.length === 0) {
            throw new Error('No music found for your search')
        }
        
        const track = tracks[0]
        
        // Send downloading message
        await sock.sendMessage(from, { 
            text: `🎵 Found: ${track.title}\n📥 Downloading...` 
        })
        
        // Get video info with timeout
        const videoInfo = await Promise.race([
            ytdl.getInfo('https://www.youtube.com/watch?v=' + track.id, { lang: 'id' }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('YouTube info timeout')), 30000)
            )
        ])
        
        // Create temp file path
        songPath = `./XeonMedia/audio/${randomBytes(3).toString('hex')}.mp3`
        
        // Ensure directory exists
        if (!fs.existsSync('./XeonMedia/audio/')) {
            fs.mkdirSync('./XeonMedia/audio/', { recursive: true })
        }
        
        // Create download stream with timeout
        stream = ytdl(track.id, { 
            filter: 'audioonly', 
            quality: 140 
        }).on('error', err => {
            throw new Error('YouTube download error: ' + err.message)
        })
        
        // Convert to MP3
        const file = await new Promise((resolve, reject) => {
            const command = ffmpeg(stream)
                .audioFrequency(44100)
                .audioChannels(2)
                .audioBitrate(128)
                .audioCodec('libmp3lame')
                .audioQuality(5)
                .toFormat('mp3')
                .save(songPath)
                .on('end', () => resolve(songPath))
                .on('error', (err) => reject(err))

            // Add timeout
            setTimeout(() => {
                command.kill('SIGKILL')
                reject(new Error('FFmpeg conversion timeout'))
            }, 300000) // 5 minutes timeout
        })
        
        // Write metadata with fallback values
        await writeTags(file, {
            Title: track.title,
            Artist: track.artist,
            Image: track.image,
            Album: track.album,
            Year: videoInfo.videoDetails?.publishDate?.split('-')[0] || new Date().getFullYear().toString()
        })
        
        return {
            path: file,
            meta: track,
            size: fs.statSync(file).size
        }
    } catch (error) {
        // Clean up if something went wrong
        if (stream) stream.destroy()
        if (songPath && fs.existsSync(songPath)) {
            fs.unlinkSync(songPath)
        }
        throw error
    }
}

// Function to download video info with proper error handling
const getVideoInfo = async (query) => {
    try {
        if (!query) throw new Error('No query provided')
        
        const videoId = isYTUrl(query) ? getVideoID(query) : query
        const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + videoId, { lang: 'id' })
        const format = ytdl.chooseFormat(videoInfo.formats, { format: 134, filter: 'videoandaudio' })
        
        // Handle potential undefined values
        const details = videoInfo.videoDetails || {}
        const selectedFormat = format || {}
        
        return {
            title: details.title || 'Unknown Title',
            thumb: details.thumbnails?.slice(-1)[0] || { url: '' },
            date: details.publishDate || 'Unknown date',
            duration: details.lengthSeconds || 0,
            channel: details.ownerChannelName || 'Unknown channel',
            quality: selectedFormat.qualityLabel || 'Unknown quality',
            contentLength: selectedFormat.contentLength || 0,
            description: details.description || '',
            videoUrl: selectedFormat.url || ''
        }
    } catch (error) {
        throw error
    }
}

// Main YouTube Music Download Command
export default async function ytmusic(sock, msg, from) {
    try {
        // Extract command arguments
        const args = msg.body.split(' ').slice(1)
        
        if (args.length === 0) {
            await sock.sendMessage(from, { 
                text: `🎵 *YouTube Music Downloader*\n\n` +
                      `*Usage:*\n` +
                      `• \`!ytmusic [song name]\` - Download music\n` +
                      `• \`!ytmusic Bohemian Rhapsody Queen\`\n\n` +
                      `*Features:*\n` +
                      `✅ High quality MP3 (128kbps)\n` +
                      `✅ Album artwork embedded\n` +
                      `✅ Complete metadata tags\n` +
                      `✅ Auto artist/title detection`
            })
            return
        }
        
        const query = args.join(' ')
        
        // Validate query
        if (query.length < 2) {
            await sock.sendMessage(from, { 
                text: '❌ Please provide a longer search query (at least 2 characters)' 
            })
            return
        }
        
        // Download the music
        const result = await downloadMusic(query, sock, from)
        
        // Send success message with file
        await sock.sendMessage(from, {
            text: `✅ *Download Complete!*\n\n` +
                  `🎵 *Title:* ${result.meta.title}\n` +
                  `👤 *Artist:* ${result.meta.artist}\n` +
                  `💿 *Album:* ${result.meta.album}\n` +
                  `⏱️ *Duration:* ${result.meta.duration.label}\n` +
                  `📁 *Size:* ${(result.size / (1024 * 1024)).toFixed(2)} MB`
        })
        
        // Send the audio file
        await sock.sendMessage(from, {
            audio: { url: result.path },
            mimetype: 'audio/mpeg',
            fileName: `${result.meta.title.replace(/[^\w\s]/gi, '')}.mp3`, // Remove special chars
            ptt: false
        })
        
        // Clean up file after sending
        setTimeout(() => {
            try {
                if (fs.existsSync(result.path)) {
                    fs.unlinkSync(result.path)
                }
            } catch (err) {
                console.log('Error cleaning up file:', err.message)
            }
        }, 60000) // Delete after 1 minute
        
    } catch (error) {
        console.error('YouTube Music Download Error:', error)
        
        await sock.sendMessage(from, { 
            text: `❌ *Download Failed*\n\n` +
                  `*Error:* ${error.message}\n\n` +
                  `*Possible causes:*\n` +
                  `• Song not found\n` +
                  `• Network issues\n` +
                  `• YouTube restrictions\n` +
                  `• Server temporarily unavailable\n\n` +
                  `Please try again with a different search term.`
        })
    }
}

// Command metadata
ytmusic.description = "Download music from YouTube with full metadata and album artwork"
ytmusic.emoji = "🎵"

// YouTube Video Info Command
export async function ytvideo(sock, msg, from) {
    try {
        const args = msg.body.split(' ').slice(1)
        
        if (args.length === 0) {
            await sock.sendMessage(from, { 
                text: `📹 *YouTube Video Info*\n\n*Usage:* \`!ytvideo [YouTube URL]\`` 
            })
            return
        }
        
        const url = args[0]
        
        if (!isYTUrl(url)) {
            await sock.sendMessage(from, { 
                text: '❌ Please provide a valid YouTube URL' 
            })
            return
        }
        
        await sock.sendMessage(from, { text: '🔍 Getting video information...' })
        
        const info = await getVideoInfo(url)
        
        await sock.sendMessage(from, {
            text: `📹 *Video Information*\n\n` +
                  `🎬 *Title:* ${info.title}\n` +
                  `📺 *Channel:* ${info.channel}\n` +
                  `⏱️ *Duration:* ${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')}\n` +
                  `📅 *Published:* ${info.date}\n` +
                  `🎥 *Quality:* ${info.quality}\n` +
                  `📁 *Size:* ${(info.contentLength / (1024 * 1024)).toFixed(2)} MB\n\n` +
                  `🔗 *Download URL:* ${info.videoUrl}`
        })
        
        // Send thumbnail if available
        if (info.thumb?.url) {
            await sock.sendMessage(from, {
                image: { url: info.thumb.url },
                caption: `📸 Thumbnail for: ${info.title}`
            })
        }
        
    } catch (error) {
        console.error('YouTube Video Info Error:', error)
        await sock.sendMessage(from, { 
            text: `❌ Failed to get video information: ${error.message}` 
        })
    }
}

ytvideo.description = "Get YouTube video information and download link"
ytvideo.emoji = "📹"