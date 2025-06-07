import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';


// Utility function to handle FFmpeg conversions
function executeFFmpeg(inputBuffer, ffmpegArgs = [], inputExtension = '', outputExtension = '') {
    return new Promise(async (resolve, reject) => {
        try {
            // Create temporary file paths
            const inputFilePath = path.join(__dirname, "../tmp", Date.now() + '.' + inputExtension);
            const outputFilePath = inputFilePath + '.' + outputExtension;
            
            // Write input buffer to temporary file
            await fs.promises.writeFile(inputFilePath, inputBuffer);
            
            // Execute FFmpeg command
            const ffmpegProcess = spawn("ffmpeg", ['-y', '-i', inputFilePath, ...ffmpegArgs, outputFilePath]);
            
            ffmpegProcess.on("error", reject);
            
            ffmpegProcess.on("close", async (exitCode) => {
                try {
                    // Clean up input file
                    await fs.promises.unlink(inputFilePath);
                    
                    if (exitCode !== 0) {
                        return reject(new Error(`FFmpeg process exited with code ${exitCode}`));
                    }
                    
                    // Read output file and return result
                    const outputBuffer = await fs.promises.readFile(outputFilePath);
                    
                    resolve({
                        data: outputBuffer,
                        filename: outputFilePath,
                        delete() {
                            return fs.promises.unlink(outputFilePath);
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Convert audio/video to WhatsApp PTT (Push-to-Talk) format
function convertToPTT(inputBuffer, inputExtension) {
    return executeFFmpeg(
        inputBuffer, 
        ["-vn", '-c:a', "libopus", '-b:a', "128k", "-vbr", 'on'], 
        inputExtension, 
        "ogg"
    );
}

// Convert to audio (Opus format)
function convertToAudio(inputBuffer, inputExtension) {
    return executeFFmpeg(
        inputBuffer, 
        ["-vn", "-c:a", 'libopus', "-b:a", '128k', '-vbr', 'on', "-compression_level", '10'], 
        inputExtension, 
        "opus"
    );
}

// Convert to video (MP4 format)
function convertToVideo(inputBuffer, inputExtension) {
    return executeFFmpeg(
        inputBuffer, 
        ['-c:v', "libx264", "-c:a", "aac", "-ab", "128k", '-ar', "44100", "-crf", '32', '-preset', "slow"], 
        inputExtension, 
        'mp4'
    );
}

// Bot command to convert media to PTT (voice note)
export async function toptt(sock, msg, from) {
    try {
        // Check if message contains media
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const audioMessage = msg.message?.audioMessage || quotedMessage?.audioMessage;
        const videoMessage = msg.message?.videoMessage || quotedMessage?.videoMessage;
        const documentMessage = msg.message?.documentMessage || quotedMessage?.documentMessage;
        
        const mediaMessage = audioMessage || videoMessage || documentMessage;
        
        if (!mediaMessage) {
            await sock.sendMessage(from, { 
                text: '❌ Please send an audio/video file or reply to one to convert to voice note (PTT)!' 
            });
            return;
        }
        
        await sock.sendMessage(from, { text: '🔄 Converting to voice note... Please wait.' });
        
        // Download the media
        const mediaBuffer = await sock.downloadMediaMessage(msg);
        
        // Determine input format
        const mimeType = mediaMessage.mimetype || '';
        const inputExtension = mimeType.split('/')[1] || 'mp3';
        
        // Convert to PTT
        const result = await convertToPTT(mediaBuffer, inputExtension);
        
        // Send as voice note
        await sock.sendMessage(from, {
            audio: result.data,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        });
        
        // Clean up temporary file
        await result.delete();
        
    } catch (error) {
        console.error('PTT conversion error:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to convert to voice note. Make sure FFmpeg is installed and the file is a valid media file.' 
        });
    }
}

// Bot command to convert media to audio
export async function toaudio(sock, msg, from) {
    try {
        // Check if message contains media
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const audioMessage = msg.message?.audioMessage || quotedMessage?.audioMessage;
        const videoMessage = msg.message?.videoMessage || quotedMessage?.videoMessage;
        const documentMessage = msg.message?.documentMessage || quotedMessage?.documentMessage;
        
        const mediaMessage = audioMessage || videoMessage || documentMessage;
        
        if (!mediaMessage) {
            await sock.sendMessage(from, { 
                text: '❌ Please send a video/audio file or reply to one to extract audio!' 
            });
            return;
        }
        
        await sock.sendMessage(from, { text: '🔄 Converting to audio... Please wait.' });
        
        // Download the media
        const mediaBuffer = await sock.downloadMediaMessage(msg);
        
        // Determine input format
        const mimeType = mediaMessage.mimetype || '';
        const inputExtension = mimeType.split('/')[1] || 'mp4';
        
        // Convert to audio
        const result = await convertToAudio(mediaBuffer, inputExtension);
        
        // Send as audio file
        await sock.sendMessage(from, {
            audio: result.data,
            mimetype: 'audio/opus',
            fileName: `converted_audio_${Date.now()}.opus`
        });
        
        // Clean up temporary file
        await result.delete();
        
    } catch (error) {
        console.error('Audio conversion error:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to convert to audio. Make sure FFmpeg is installed and the file is a valid media file.' 
        });
    }
}

// Bot command to convert media to video
export async function tovideo(sock, msg, from) {
    try {
        // Check if message contains media
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const videoMessage = msg.message?.videoMessage || quotedMessage?.videoMessage;
        const documentMessage = msg.message?.documentMessage || quotedMessage?.documentMessage;
        
        const mediaMessage = videoMessage || documentMessage;
        
        if (!mediaMessage) {
            await sock.sendMessage(from, { 
                text: '❌ Please send a video file or reply to one to convert to MP4!' 
            });
            return;
        }
        
        await sock.sendMessage(from, { text: '🔄 Converting to MP4 video... Please wait.' });
        
        // Download the media
        const mediaBuffer = await sock.downloadMediaMessage(msg);
        
        // Determine input format
        const mimeType = mediaMessage.mimetype || '';
        const inputExtension = mimeType.split('/')[1] || 'mp4';
        
        // Convert to video
        const result = await convertToVideo(mediaBuffer, inputExtension);
        
        // Send as video file
        await sock.sendMessage(from, {
            video: result.data,
            mimetype: 'video/mp4',
            fileName: `converted_video_${Date.now()}.mp4`
        });
        
        // Clean up temporary file
        await result.delete();
        
    } catch (error) {
        console.error('Video conversion error:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to convert to video. Make sure FFmpeg is installed and the file is a valid video file.' 
        });
    }
}

// Add command descriptions and emojis
toptt.description = "Convert audio/video to voice note (PTT)";
toptt.emoji = "🎵";

toaudio.description = "Extract audio from video files";
toaudio.emoji = "🔊";

tovideo.description = "Convert video files to MP4 format";
tovideo.emoji = "🎬";

//# Convert audio to voice note
//[Send audio file] + .toptt

//# Extract audio from video
//[Send video file] + .toaudio

//# Convert video to MP4
//[Send video file] + .tovideo

//# Or reply to media files
//[Reply to media] .toptt
//[Reply to media] .toaudio  
//[Reply to media] .tovideo