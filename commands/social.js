import axios from 'axios';

export default async function social(sock, msg, from, args) {
  try {
    const url = args[0];
    if (!url) {
      return sock.sendMessage(from, { 
        text: '📌 *Usage:* !social <url>\n\n' +
              '🌐 *Supported Platforms:*\n' +
              '- TikTok\n- Instagram\n- Twitter\n- Facebook\n\n' +
              'Example: !social https://tiktok.com/...'
      });
    }

    // Show typing indicator
    await sock.sendPresenceUpdate('composing', from);

    let result;
    let platform = '';

    // Normalize URL (remove special characters if any)
    const cleanUrl = url.replace(/[^\x20-\x7E]/g, '').trim();
    
    if (cleanUrl.includes('tiktok')) {
      platform = 'TikTok';
      const apiUrl = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${extractTikTokId(cleanUrl)}`;
      const response = await axios.get(apiUrl);
      result = {
        mediaUrl: response.data?.aweme_list?.[0]?.video?.play_addr?.url_list?.[0] || null
      };
    } 
    else if (cleanUrl.includes('instagram')) {
      platform = 'Instagram';
      return sock.sendMessage(from, {
        text: '⚠️ Instagram downloads are currently not supported due to API restrictions'
      });
    }
    else if (cleanUrl.includes('twitter') || cleanUrl.includes('x.com')) {
      platform = 'Twitter';
      return sock.sendMessage(from, {
        text: '⚠️ Twitter downloads require API authentication. Consider using a dedicated service.'
      });
    }
    else if (cleanUrl.includes('facebook')) {
      platform = 'Facebook';
      return sock.sendMessage(from, {
        text: '⚠️ Facebook downloads are currently not supported due to API restrictions'
      });
    }
    else {
      return sock.sendMessage(from, { 
        text: '❌ *Unsupported Platform*\n\n' +
              'I only support:\n' +
              '• TikTok\n• Instagram\n• Twitter\n• Facebook\n\n' +
              'Please check your URL and try again.'
      });
    }

    if (!result?.mediaUrl) {
      return sock.sendMessage(from, {
        text: `⚠️ *${platform} Download Failed*\n\n` +
              'Possible reasons:\n' +
              '• Private content\n• Invalid URL\n• Server error\n\n' +
              'Try again later or use a different URL.'
      });
    }

    // Send the media
    await sock.sendMessage(from, {
      video: { url: result.mediaUrl },
      mimetype: 'video/mp4',
      caption: `⬇️ *${platform} Download*`
    });

    // Mark as read
    await sock.readMessages([msg.key]);

  } catch (error) {
    console.error('Social command error:', error);
    await sock.sendMessage(from, {
      text: '🔥 *Download Failed*\n\n' +
            'An unexpected error occurred. Please:\n' +
            '1. Check your URL\n' +
            '2. Try again later\n' +
            '3. Contact support if problem persists'
    });
  }
}

// Helper functions
function extractTikTokId(url) {
  // Handle both regular URLs and shortened vm.tiktok.com URLs
  const match = url.match(/(?:video|v)\/(\d+)/) || url.match(/\/@[\w.]+\/video\/(\d+)/);
  return match?.[1] || '';
}

// Command metadata
export const description = "Download media from social platforms";
export const category = "Social Media";
social.description = description;
social.category = category;
social.usage = "!social <url>";