import fs from 'fs';
import path from 'path';

export default async function fonts(sock, msg, from) {
    const filePath = path.join(process.cwd(), 'fonts-preview.txt');

    // Send short WhatsApp preview manually
    const previewText = `📑 *Sample Fonts Preview:*\n\n🖋️ *Standard*\n\`\`\`
  _____                      _   
 | ____|_ __ _ __   ___  ___| |_ 
 |  _| | '__| '_ \\ / _ \\/ __| __|
 | |___| |  | | | |  __/\\__ \\ |_ 
 |_____|_|  |_| |_|\\___||___/\\__|
\`\`\`\`\n\n🖋️ *Ghost*\n\`\`\`
   ('-.  _  .-')       .-') _   ('-.    
 _(  OO)( \\( -O )     ( OO ) )_(  OO)   
(,------.,------. ,--./ ,--,'(,------.  
\`\`\`\``;

    // Step 1: Send preview
    await sock.sendMessage(from, { text: previewText }, { quoted: msg });

    // Step 2: Send existing .txt file
    await sock.sendMessage(from, {
        document: fs.readFileSync(filePath),
        fileName: 'fonts-preview.txt',
        mimetype: 'text/plain',
        caption: '📄 Full font preview file for all styles (stored version).'
    }, { quoted: msg });

    // ⛔ DO NOT DELETE — nothing gets removed
}

export const description = "Preview figlet fonts + download static .txt preview";
