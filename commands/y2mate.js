// Fixed y2mate.js - ES Module version with resolution fallback
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

/**
 * Makes a POST request with form data to y2mate API
 * @param {string} url - The API endpoint URL
 * @param {object} formdata - Form data to send in the request body
 * @returns {Promise} - Fetch response promise
 */
function post(url, formdata) {
  return fetch(url, {
    method: 'POST',
    headers: {
      accept: "*/*",
      'accept-language': "en-US,en;q=0.9",
      'content-type': "application/x-www-form-urlencoded; charset=UTF-8"
    },
    body: new URLSearchParams(Object.entries(formdata))
  });
}

// Regular expression to extract YouTube video ID from various YouTube URL formats
const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;

// Resolution priority order (highest to lowest)
const RESOLUTION_PRIORITY = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];

/**
 * Core function to download YouTube Video via y2mate service
 * @param {String} url - YouTube Video URL
 * @param {String} quality - Video quality (144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 2160p)
 * @param {String} type - Download type (mp3 for audio, mp4 for video)
 * @param {String} bitrate - Quality bitrate (144-2160 for video, 128 for audio)
 * @param {String} server - Y2mate server to use (id4, en60, en61, en68)
 * @returns {Object} - Download information including link, title, thumbnail, filesize
 */
async function yt(url, quality, type, bitrate, server = 'en68') {
  try {
    // Extract YouTube video ID from URL
    let ytId = ytIdRegex.exec(url);
    if (!ytId) throw new Error('Invalid YouTube URL');
    
    // Standardize URL format
    url = 'https://youtu.be/' + ytId[1];
    
    // Step 1: Analyze the video to get available formats
    let res = await post(`https://www.y2mate.com/mates/${server}/analyze/ajax`, {
      url,
      q_auto: 0,
      ajax: 1
    });
    
    let json = await res.json();
    
    // Parse HTML response to extract video information
    let { document } = (new JSDOM(json.result)).window;
    let tables = document.querySelectorAll('table');
    
    // Select appropriate table (0 for video, 1 for audio)
    let table = tables[{ mp4: 0, mp3: 1 }[type] || 0];
    let list = {};
    let availableQualities = [];
    
    // Extract available quality options based on type
    switch (type) {
      case 'mp4':
        // Get video qualities and their file sizes
        const videoLinks = [...table.querySelectorAll('td > a[href="#"]')]
          .filter(v => !/\.3gp/.test(v.innerHTML)); // Filter out 3gp format
        
        // Create mapping of all available qualities
        list = Object.fromEntries(videoLinks.map(v => {
          const quality = v.innerHTML.match(/.*?(?=\()/)[0].trim();
          const size = v.parentElement.nextSibling.nextSibling.innerHTML;
          return [quality, size];
        }));
        
        // Extract just the quality labels
        availableQualities = Object.keys(list);
        break;
        
      case 'mp3':
        // For audio, usually only 128kbps is available
        list = {
          '128kbps': table.querySelector('td > a[href="#"]').parentElement.nextSibling.nextSibling.innerHTML
        };
        availableQualities = ['128kbps'];
        break;
        
      default:
        list = {};
    }
    
    // If no qualities available, throw error
    if (availableQualities.length === 0) {
      throw new Error('No download options available for this video');
    }
    
    // Handle resolution fallback for video downloads
    if (type === 'mp4') {
      // If requested quality is available, use it
      if (list[quality]) {
        // Use the requested quality
      } 
      // Otherwise find the closest available resolution
      else {
        // Find all available resolutions in our priority order
        const availableInPriority = RESOLUTION_PRIORITY.filter(res => 
          availableQualities.includes(res)
        );
        
        if (availableInPriority.length === 0) {
          throw new Error('No suitable video quality available');
        }
        
        // Get the index of the requested quality in priority order
        const requestedIndex = RESOLUTION_PRIORITY.indexOf(quality);
        
        // Find the closest available resolution
        let selectedQuality = availableInPriority[0]; // Default to highest available
        
        if (requestedIndex !== -1) {
          // Find the first available quality that's <= requested quality
          for (const res of availableInPriority) {
            if (RESOLUTION_PRIORITY.indexOf(res) >= requestedIndex) {
              selectedQuality = res;
              break;
            }
          }
        }
        
        quality = selectedQuality;
      }
    }
    
    // Get file size for selected quality
    let filesize = list[quality];
    if (!filesize) throw new Error(`Quality ${quality} not available`);
    
    // Extract conversion ID from page source
    let id = /var k__id = "(.*?)"/.exec(document.body.innerHTML) || ['', ''];
    
    // Extract video metadata
    let thumb = document.querySelector('img').src; // Thumbnail URL
    let title = document.querySelector('b').innerHTML; // Video title
    
    // Step 2: Request conversion and download link
    let res2 = await post(`https://www.y2mate.com/mates/${server}/convert`, {
      type: 'youtube',
      _id: id[1],
      v_id: ytId[1],
      ajax: '1',
      token: '',
      ftype: type,
      fquality: bitrate
    });
    
    let json2 = await res2.json();
    
    // Calculate file size in KB
    let KB = parseFloat(filesize) * (1000 * /MB$/.test(filesize));
    
    // Extract download URL from response
    let resUrl = /<a.+?href="(.+?)"/.exec(json2.result)[1];
    
    return {
      dl_link: resUrl.replace(/https/g, 'http'), // Use HTTP for compatibility
      thumb,
      title,
      filesizeF: filesize, // Formatted file size (e.g., "25.4 MB")
      filesize: KB, // File size in KB
      quality: quality, // Actual quality used (might differ from requested)
      availableQualities: availableQualities // All available qualities
    };
    
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

// ==================== COMMAND FUNCTIONS ====================

/**
 * Download YouTube video as MP4 with resolution fallback
 * Usage: ytv <youtube_url> [quality]
 * Example: ytv https://youtu.be/dQw4w9WgXcQ 720p
 */
const ytv = async (sock, msg, from, args) => {
  try {
    // Check if URL is provided
    if (!args[0]) {
      await sock.sendMessage(from, { 
        text: '❌ Please provide a YouTube URL!\n\n*Usage:* ytv <youtube_url> [quality]\n*Example:* ytv https://youtu.be/dQw4w9WgXcQ 720p\n\n*Available qualities:* 144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 2160p' 
      });
      return;
    }

    const url = args[0];
    const requestedQuality = args[1] || '720p'; // Default to 720p
    
    // Validate YouTube URL
    if (!ytIdRegex.test(url)) {
      await sock.sendMessage(from, { text: '❌ Invalid YouTube URL! Please provide a valid YouTube link.' });
      return;
    }

    // Send processing message
    await sock.sendMessage(from, { text: '⏳ Processing video download... Please wait.' });

    // Download video with automatic resolution fallback
    const result = await yt(url, requestedQuality, 'mp4', requestedQuality.replace('p', ''));
    
    // Check if we got a different quality than requested
    const qualityNote = result.quality !== requestedQuality 
      ? `\n⚠️ *Note:* ${requestedQuality} not available. Using ${result.quality} instead.`
      : '';
    
    // Send video information and download link
    const response = `🎥 *Video Download Ready*${qualityNote}\n\n` +
                    `📝 *Title:* ${result.title}\n` +
                    `📊 *Quality:* ${result.quality}\n` +
                    `📦 *Size:* ${result.filesizeF}\n` +
                    `🔗 *Download:* ${result.dl_link}\n\n` +
                    `💡 *Tip:* Click the link to download your video!` +
                    `\n\n*Available qualities:* ${result.availableQualities.join(', ')}`;

    await sock.sendMessage(from, { 
      text: response,
      contextInfo: {
        externalAdReply: {
          title: result.title,
          body: `Quality: ${result.quality} | Size: ${result.filesizeF}`,
          thumbnailUrl: result.thumb,
          mediaType: 1,
          showAdAttribution: false
        }
      }
    });

  } catch (error) {
    await sock.sendMessage(from, { text: `❌ Error: ${error.message}` });
  }
};

ytv.description = "Download YouTube videos as MP4 with automatic resolution fallback";
ytv.emoji = "🎥";

/**
 * Download YouTube video as MP3 audio
 * Usage: yta <youtube_url>
 * Example: yta https://youtu.be/dQw4w9WgXcQ
 */
export const yta = async (sock, msg, from, args) => {
  try {
    // Check if URL is provided
    if (!args[0]) {
      await sock.sendMessage(from, { 
        text: '❌ Please provide a YouTube URL!\n\n*Usage:* yta <youtube_url>\n*Example:* yta https://youtu.be/dQw4w9WgXcQ' 
      });
      return;
    }

    const url = args[0];
    
    // Validate YouTube URL
    if (!ytIdRegex.test(url)) {
      await sock.sendMessage(from, { text: '❌ Invalid YouTube URL! Please provide a valid YouTube link.' });
      return;
    }

    // Send processing message
    await sock.sendMessage(from, { text: '⏳ Processing audio download... Please wait.' });

    // Download audio
    const result = await yt(url, '128kbps', 'mp3', '128');
    
    // Send audio information and download link
    const response = `🎵 *Audio Download Ready*\n\n` +
                    `📝 *Title:* ${result.title}\n` +
                    `🎧 *Quality:* 128kbps MP3\n` +
                    `📦 *Size:* ${result.filesizeF}\n` +
                    `🔗 *Download:* ${result.dl_link}\n\n` +
                    `💡 *Tip:* Click the link to download your audio!`;

    await sock.sendMessage(from, { 
      text: response,
      contextInfo: {
        externalAdReply: {
          title: result.title,
          body: `Audio: 128kbps MP3 | Size: ${result.filesizeF}`,
          thumbnailUrl: result.thumb,
          mediaType: 1,
          showAdAttribution: false
        }
      }
    });

  } catch (error) {
    await sock.sendMessage(from, { text: `❌ Error: ${error.message}` });
  }
};

yta.description = "Download YouTube videos as MP3 audio";
yta.emoji = "🎵";

/**
 * Get YouTube video information without downloading
 * Usage: ytinfo <youtube_url>
 * Example: ytinfo https://youtu.be/dQw4w9WgXcQ
 */
export const ytinfo = async (sock, msg, from, args) => {
  try {
    if (!args[0]) {
      await sock.sendMessage(from, { 
        text: '❌ Please provide a YouTube URL!\n\n*Usage:* ytinfo <youtube_url>\n*Example:* ytinfo https://youtu.be/dQw4w9WgXcQ' 
      });
      return;
    }

    const url = args[0];
    
    if (!ytIdRegex.test(url)) {
      await sock.sendMessage(from, { text: '❌ Invalid YouTube URL! Please provide a valid YouTube link.' });
      return;
    }

    await sock.sendMessage(from, { text: '⏳ Getting video information...' });

    // Get video info (use 360p as default to get basic info)
    const result = await yt(url, '360p', 'mp4', '360');
    
    const response = `📹 *YouTube Video Information*\n\n` +
                    `📝 *Title:* ${result.title}\n` +
                    `🔗 *URL:* ${url}\n` +
                    `📊 *Available Qualities:* ${result.availableQualities.join(', ')}\n\n` +
                    `*Available Commands:*\n` +
                    `• ytv ${url} [quality] - Download as video\n` +
                    `• yta ${url} - Download as audio`;

    await sock.sendMessage(from, { 
      text: response,
      contextInfo: {
        externalAdReply: {
          title: result.title,
          body: "YouTube Video Information",
          thumbnailUrl: result.thumb,
          mediaType: 1,
          showAdAttribution: false
        }
      }
    });

  } catch (error) {
    await sock.sendMessage(from, { text: `❌ Error: ${error.message}` });
  }
};

ytinfo.description = "Get YouTube video information";
ytinfo.emoji = "ℹ️";

// Export the regex for external use
export { ytIdRegex };

// Export default function
export default ytv;