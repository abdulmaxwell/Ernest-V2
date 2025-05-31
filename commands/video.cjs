const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const { getRandom } = require('../../lib/myfunc');
const { toAudio } = require('../../lib/converter');

const execAsync = promisify(exec);

async function webp2mp4(source) {
  try {
    const fetch = require('node-fetch');
    const FormData = require('form-data');
    const cheerio = require('cheerio');

    let form = new FormData();
    let isUrl = typeof source === 'string' && /https?:\/\//.test(source);
    
    if (isUrl) {
      form.append('new-image-url', source);
      form.append('new-image', '');
    } else {
      form.append('new-image-url', '');
      form.append('new-image', source, { filename: 'image.webp', contentType: 'image/webp' });
    }
    
    console.log('Uploading to ezgif...');
    let res = await fetch('https://ezgif.com/webp-to-mp4', {
      method: 'POST',
      body: form,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    
    let html = await res.text();
    let $ = cheerio.load(html);
    
    // Check if upload was successful
    if (!$('form input[name="file"]').val()) {
      throw new Error('Upload failed - no file parameter found');
    }
    
    let form2 = new FormData();
    let obj = {};
    
    $('form input[name]').each((_, el) => {
      let name = $(el).attr('name');
      let value = $(el).val();
      if (name && value) {
        obj[name] = value;
        form2.append(name, value);
      }
    });
    
    console.log('Converting...');
    let res2 = await fetch('https://ezgif.com/webp-to-mp4/' + obj.file, {
      method: 'POST',
      body: form2,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!res2.ok) throw new Error(`Conversion failed: HTTP ${res2.status}`);
    
    let html2 = await res2.text();
    let $2 = cheerio.load(html2);
    
    let videoSrc = $2('div#output > p.outfile > video > source').attr('src') || 
                   $2('div#output video source').attr('src') ||
                   $2('video source').attr('src');
    
    if (!videoSrc) {
      // Try alternative selectors
      videoSrc = $2('a[href*=".mp4"]').attr('href');
    }
    
    if (!videoSrc) throw new Error('Could not find converted video URL');
    
    return new URL(videoSrc, res2.url).toString();
  } catch (error) {
    console.error('webp2mp4 error:', error);
    throw error;
  }
}

module.exports = [
  {
    command: ['volvideo', 'volume'],
    operate: async ({ Cypher, m, reply, args, prefix, command }) => {
      try {
        const quoted = m.quoted ? m.quoted : null;
        const mime = quoted?.mimetype || "";
        
        // Validation
        if (!args[0]) return reply(`*❌ Volume level required!*\n\n*Usage:* ${prefix + command} [0.1-5.0]\n*Example:* ${prefix + command} 2.0\n\n*Note:* 1.0 = normal, 2.0 = double volume, 0.5 = half volume`);
        
        const volume = parseFloat(args[0]);
        if (isNaN(volume) || volume < 0.1 || volume > 5.0) {
          return reply(`*❌ Invalid volume level!*\n\nVolume must be between 0.1 and 5.0\n• 0.1 = very quiet\n• 1.0 = normal\n• 2.0 = double volume\n• 5.0 = maximum`);
        }
        
        if (!quoted || !/video/.test(mime)) {
          return reply(`*❌ Please reply to a video file!*\n\n*Usage:* Reply to a video with *${prefix + command} ${volume}*`);
        }

        reply('🔄 *Processing video volume...*\nThis may take a moment ⏳');

        const media = await Cypher.downloadAndSaveMediaMessage(quoted, "volume");
        const outputFile = getRandom(".mp4");

        // Use async exec with better error handling
        const command_ffmpeg = `ffmpeg -i "${media}" -filter:a "volume=${volume}" -c:v copy -avoid_negative_ts make_zero "${outputFile}"`;
        
        console.log('Running FFmpeg command:', command_ffmpeg);
        
        await execAsync(command_ffmpeg);
        
        // Check if output file exists and has content
        if (!fs.existsSync(outputFile) || fs.statSync(outputFile).size === 0) {
          throw new Error('Output file was not created or is empty');
        }

        const files = fs.readFileSync(outputFile);
        await Cypher.sendMessage(
          m.chat,
          { 
            video: files, 
            mimetype: "video/mp4",
            caption: `✅ *Volume adjusted to ${volume}x*`
          },
          { quoted: m }
        );

        // Cleanup
        fs.unlinkSync(media);
        fs.unlinkSync(outputFile);
        
      } catch (error) {
        console.error('Volume adjustment error:', error);
        reply(`❌ *Failed to adjust video volume!*\n\nError: ${error.message}\n\n*Possible solutions:*\n• Try a different volume level\n• Make sure the video file isn't corrupted\n• Try with a smaller video file`);
        
        // Cleanup on error
        try {
          if (fs.existsSync(media)) fs.unlinkSync(media);
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
    }
  },
  {
    command: ['toaudio', 'tomp3', 'audio'],
    operate: async ({ Cypher, m, reply }) => {
      try {
        const quoted = m.quoted ? m.quoted : null;
        const mime = quoted?.mimetype || "";
        
        if (!quoted) return reply('*❌ Please reply to a video!*\n\n*Usage:* Reply to a video with this command to extract audio');
        if (!/video/.test(mime)) return reply('*❌ Only video files can be converted to audio!*\n\nSupported formats: MP4, AVI, MOV, MKV, etc.');

        reply('🎵 *Converting video to audio...*\nExtracting audio track ⏳');

        let buffer = await quoted.download();
        
        if (!buffer || buffer.length === 0) {
          throw new Error('Failed to download video file');
        }
        
        let converted = await toAudio(buffer, 'mp4');

        if (!converted || !converted.data) {
          throw new Error('Audio conversion failed');
        }

        await Cypher.sendMessage(
          m.chat, 
          { 
            audio: converted.data, 
            mimetype: 'audio/mpeg',
            fileName: 'converted_audio.mp3'
          }, 
          { quoted: m }
        );
        
        // Cleanup
        if (converted.delete) await converted.delete();
        
      } catch (error) {
        console.error('Audio conversion error:', error);
        reply(`❌ *Failed to convert video to audio!*\n\nError: ${error.message}\n\n*Possible solutions:*\n• Try with a different video file\n• Make sure the video has an audio track\n• Try with a smaller file size`);
      }
    }
  },
  {
    command: ['tovideo', 'tovid', 'tomp4', 'stickervideo'],
    operate: async ({ m, Cypher, reply, prefix, command }) => {
      try {
        if (!m.quoted) {
          return reply(`*❌ Please reply to a sticker!*\n\n*Usage:* Reply to an animated sticker with *${prefix + command}*`);
        }
        
        const mime = m.quoted.mimetype || '';
        if (!mime.includes('webp')) {
          return reply(`*❌ Please reply to a WebP sticker!*\n\nThis command converts animated stickers (WebP) to MP4 videos.`);
        }
        
        reply('🎬 *Converting sticker to video...*\nProcessing animation ⏳');
        
        const media = await m.quoted.download();
        
        if (!media || media.length === 0) {
          throw new Error('Failed to download sticker');
        }
        
        console.log('Downloaded media size:', media.length);
        
        const videoUrl = await webp2mp4(media);
        
        if (!videoUrl) {
          throw new Error('Conversion service returned empty URL');
        }
        
        console.log('Conversion successful, URL:', videoUrl);
        
        // Try to send the video
        if (Cypher.sendFile) {
          await Cypher.sendFile(m.chat, videoUrl, 'converted.mp4', '✅ *Sticker converted to video!*', m);
        } else {
          // Alternative method if sendFile doesn't exist
          await Cypher.sendMessage(m.chat, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: '✅ *Sticker converted to video!*'
          }, { quoted: m });
        }
        
      } catch (error) {
        console.error('Sticker to video conversion error:', error);
        
        let errorMsg = '❌ *Failed to convert sticker to video!*\n\n';
        
        if (error.message.includes('Upload failed')) {
          errorMsg += '*Issue:* Failed to upload sticker to conversion service\n*Solution:* Try with a different sticker';
        } else if (error.message.includes('Conversion failed')) {
          errorMsg += '*Issue:* Conversion service error\n*Solution:* Try again in a few minutes';
        } else if (error.message.includes('Could not find')) {
          errorMsg += '*Issue:* Conversion completed but video not found\n*Solution:* The sticker might not be animated';
        } else {
          errorMsg += `*Error:* ${error.message}\n\n*Solutions:*\n• Make sure it's an animated sticker\n• Try with a different sticker\n• Check your internet connection`;
        }
        
        reply(errorMsg);
      }
    }
  }
];