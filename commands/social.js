import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export default async function social(sock, msg, from, args) {
  try {
    const url = args[0];
    if (!url) {
      return sock.sendMessage(from, { 
        text: '📌 *Usage:* .social <url>\n\n' +
              '🌐 *Supported Platforms:*\n' +
              '- TikTok 🎵\n- Instagram 📸\n- Twitter/X 🐦\n- YouTube 📺\n- Facebook 📘\n\n' +
              '📝 *Example:* .social https://tiktok.com/@user/video/123...'
      }, { quoted: msg });
    }

    console.log("🔍 Processing URL:", url);
    
    // Show typing indicator
    await sock.sendPresenceUpdate('composing', from);

    // Send initial status
    const statusMsg = await sock.sendMessage(from, { 
      text: '⏳ *Processing your request...*\n\n🔍 Analyzing URL...' 
    }, { quoted: msg });

    // Clean and validate URL
    const cleanUrl = url.replace(/[^\x20-\x7E]/g, '').trim();
    
    if (!isValidUrl(cleanUrl)) {
      return sock.sendMessage(from, {
        text: '❌ *Invalid URL*\n\nPlease provide a valid social media URL.'
      }, { quoted: msg });
    }

    const platform = detectPlatform(cleanUrl);
    console.log("🎯 Detected platform:", platform);

    // Update status
    await sock.sendMessage(from, { 
      text: `⏳ *Processing ${platform} URL...*\n\n📥 Attempting download...`,
      edit: statusMsg.key 
    });

    let result;

    try {
      // Method 1: Try API-based downloaders
      result = await tryApiDownload(cleanUrl, platform);
      
      if (!result) {
        // Method 2: Try yt-dlp if available
        result = await tryYtDlpDownload(cleanUrl, platform);
      }
      
      if (!result) {
        // Method 3: Try web scraping
        result = await tryWebScraping(cleanUrl, platform);
      }

    } catch (downloadError) {
      console.error(`❌ Download failed for ${platform}:`, downloadError);
    }

    if (!result || !result.mediaUrl) {
      return sock.sendMessage(from, {
        text: `❌ *${platform} Download Failed*\n\n` +
              '💡 *Possible reasons:*\n' +
              '• Private or restricted content\n' +
              '• Invalid or expired URL\n' +
              '• Platform API changes\n' +
              '• Rate limiting\n\n' +
              '🔄 Try again later or use a different URL.'
      }, { quoted: msg });
    }

    console.log("✅ Download successful, sending media...");

    // Update status
    await sock.sendMessage(from, { 
      text: `✅ *Download Complete!*\n\n📤 Sending ${platform} media...`,
      edit: statusMsg.key 
    });

    // Send the media based on type
    const mediaOptions = {
      caption: `⬇️ *Downloaded from ${platform}*\n\n` +
               `🔗 *Original:* ${cleanUrl.substring(0, 50)}${cleanUrl.length > 50 ? '...' : ''}` +
               (result.title ? `\n📝 *Title:* ${result.title.substring(0, 100)}` : '') +
               (result.author ? `\n👤 *Author:* ${result.author}` : '')
    };

    if (result.type === 'video') {
      await sock.sendMessage(from, {
        video: { url: result.mediaUrl },
        mimetype: 'video/mp4',
        ...mediaOptions
      }, { quoted: msg });
    } else if (result.type === 'image') {
      await sock.sendMessage(from, {
        image: { url: result.mediaUrl },
        ...mediaOptions
      }, { quoted: msg });
    } else {
      // Audio
      await sock.sendMessage(from, {
        audio: { url: result.mediaUrl },
        mimetype: 'audio/mp4',
        ...mediaOptions
      }, { quoted: msg });
    }

    // Clean up status message
    setTimeout(() => {
      sock.sendMessage(from, { delete: statusMsg.key }).catch(() => {});
    }, 2000);

    console.log("✅ Media sent successfully!");

  } catch (error) {
    console.error('❌ Social command error:', error);
    await sock.sendMessage(from, {
      text: '💥 *Unexpected Error*\n\n' +
            `\`\`\`${error.message}\`\`\`\n\n` +
            '🔧 Please try:\n' +
            '1. Check if URL is accessible\n' +
            '2. Try again in a few minutes\n' +
            '3. Contact support if issue persists'
    }, { quoted: msg });
  }
}

// Helper Functions
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function detectPlatform(url) {
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
  return 'Unknown Platform';
}

// Method 1: API-based downloaders
async function tryApiDownload(url, platform) {
  console.log("🔗 Trying API download...");
  
  try {
    // Try multiple free API services
    const apiServices = [
      `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`,
      `https://tikwm.com/api/?url=${encodeURIComponent(url)}`,
      `https://ssstik.io/abc?url=${encodeURIComponent(url)}`
    ];

    for (const apiUrl of apiServices) {
      try {
        console.log("🌐 Trying API:", apiUrl);
        const response = await axios.get(apiUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (response.data && response.data.video) {
          return {
            mediaUrl: response.data.video[0] || response.data.video,
            type: 'video',
            title: response.data.title || '',
            author: response.data.author || ''
          };
        }

        if (response.data && response.data.data && response.data.data.play) {
          return {
            mediaUrl: response.data.data.play,
            type: 'video',
            title: response.data.data.title || '',
            author: response.data.data.author || ''
          };
        }

      } catch (apiError) {
        console.log("⚠️ API failed:", apiError.message);
        continue;
      }
    }
  } catch (error) {
    console.log("❌ All APIs failed:", error.message);
  }
  
  return null;
}

// Method 2: yt-dlp (if installed)
async function tryYtDlpDownload(url, platform) {
  console.log("🛠️ Trying yt-dlp download...");
  
  try {
    // Check if yt-dlp is available
    await execAsync('which yt-dlp');
    
    const { stdout } = await execAsync(`yt-dlp -j "${url}"`, { timeout: 30000 });
    const info = JSON.parse(stdout);
    
    if (info.url) {
      return {
        mediaUrl: info.url,
        type: info.ext === 'mp4' ? 'video' : 'audio',
        title: info.title || '',
        author: info.uploader || ''
      };
    }
  } catch (error) {
    console.log("⚠️ yt-dlp not available or failed:", error.message);
  }
  
  return null;
}

// Method 3: Web scraping (basic)
async function tryWebScraping(url, platform) {
  console.log("🕷️ Trying web scraping...");
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    
    // Look for video URLs in the HTML
    const videoMatches = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g);
    if (videoMatches && videoMatches.length > 0) {
      return {
        mediaUrl: videoMatches[0],
        type: 'video',
        title: '',
        author: ''
      };
    }

  } catch (error) {
    console.log("⚠️ Web scraping failed:", error.message);
  }
  
  return null;
}

// Command metadata
export const description = "Download media from social platforms (TikTok, Instagram, Twitter, etc.)";
export const category = "Social Media";
export const usage = ".social <url>";

social.description = description;
social.category = category;
social.usage = usage;