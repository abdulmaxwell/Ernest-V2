import axios from 'axios';
import * as cheerio from 'cheerio';
import FormData from 'form-data';
import fs from 'fs';

export default async function webp2mp4(sock, msg, from) {
    // Check if the message contains a videoMessage or imageMessage
    if (!msg.message?.videoMessage && !msg.message?.imageMessage) {
        await sock.sendMessage(from, { text: '❌ Please send a WebP sticker or image to convert to MP4.' });
        return;
    }

    try {
        await sock.sendMessage(from, { text: '🔄 Converting WebP to MP4, please wait...' });

        // Download the media from the message
        const media = await sock.downloadMediaMessage(msg);

        // Create a temporary file path for the downloaded WebP
        const tempPath = `./temp_${Date.now()}.webp`;

        // Write the downloaded media buffer to the temporary file
        fs.writeFileSync(tempPath, media);
        console.log(`Downloaded media to: ${tempPath}`); // Log for debugging

        // --- Step 1: Upload the WebP to ezgif.com ---
        const formData = new FormData();
        formData.append("new-image-url", ''); // This field is often used for URL uploads, but we're uploading a file
        formData.append('new-image', fs.createReadStream(tempPath)); // Append the WebP file stream

        console.log('Attempting to upload WebP to ezgif.com...');
        const { data: uploadData } = await axios.post("https://s6.ezgif.com/webp-to-mp4", formData, {
            headers: {
                // Set the Content-Type header with the boundary from FormData
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`
            }
        });
        console.log('Upload response received.');

        // Load the HTML response from the upload to extract the file ID
        const $ = cheerio.load(uploadData);
        const fileId = $("input[name=\"file\"]").attr("value");

        if (!fileId) {
            throw new Error('Could not find file ID after uploading to ezgif.com. HTML structure might have changed.');
        }
        console.log(`Extracted fileId: ${fileId}`);

        // --- Step 2: Initiate the conversion on ezgif.com ---
        const convertForm = new FormData();
        convertForm.append("file", fileId); // Use the extracted file ID
        convertForm.append("convert", "Convert WebP to MP4!"); // The button value to trigger conversion

        console.log(`Attempting to convert WebP to MP4 on ezgif.com for file ID: ${fileId}...`);
        const { data: convertData } = await axios.post(`https://ezgif.com/webp-to-mp4/${fileId}`, convertForm, {
            headers: {
                // Set the Content-Type header for the conversion form
                'Content-Type': `multipart/form-data; boundary=${convertForm._boundary}`
            }
        });
        console.log('Conversion response received.');

        // Load the HTML response from the conversion to extract the video URL
        const $convert = cheerio.load(convertData);
        // Find the video source URL within the output div
        let videoUrl = $convert("div#output > p.outfile > video > source").attr('src');

        if (!videoUrl) {
            // Fallback for different HTML structures if needed or improved selector
            videoUrl = $convert("div#output > p.outfile > a.file-link").attr('href');
            if (videoUrl && !videoUrl.startsWith('https:')) {
                videoUrl = 'https:' + videoUrl;
            }
        }

        if (!videoUrl) {
            throw new Error('Could not find video URL after conversion. HTML structure might have changed.');
        }

        // Ensure the URL is absolute
        if (videoUrl.startsWith('//')) {
            videoUrl = 'https:' + videoUrl;
        }
        console.log(`Extracted video URL: ${videoUrl}`);

        // --- Step 3: Download and send the converted MP4 ---
        console.log('Downloading converted MP4 video...');
        const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        const videoBuffer = Buffer.from(videoResponse.data);
        console.log('MP4 video downloaded successfully.');

        // Send the converted MP4 video back to the user
        await sock.sendMessage(from, {
            video: videoBuffer,
            caption: '✅ WebP converted to MP4 successfully!'
        });
        console.log('MP4 video sent to user.');

    } catch (error) {
        console.error('WebP to MP4 conversion error:', error); // Always log the main error

        // Enhanced error logging based on the type of error
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error response data (from ezgif.com):', error.response.data);
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received (e.g., network error, timeout)
            console.error('Error request details:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error message:', error.message);
        }
        await sock.sendMessage(from, { text: '❌ Error converting WebP to MP4. Please try again or check the console for details.' });
    } finally {
        // --- Clean up: Delete the temporary WebP file ---
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
            console.log(`Cleaned up temporary file: ${tempPath}`);
        }
    }
}

// Metadata for the command
webp2mp4.description = "Convert WebP stickers to MP4 videos";
webp2mp4.emoji = "🎥";