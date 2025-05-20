import fs from 'fs';
import path from 'path';

export default async function fonts(sock, msg, from) {
    const filePath = path.join(process.cwd(), 'fonts-preview.txt');

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
\`\`\`\`\n\n🖋️ *Banner*\n\`\`\`
####  #    #   ##   #####  ###### ##### 
#    # #    #  #  #  #    # #      #    #
#      ###### #    # #    # #####  #    #
#  ### #    # ###### #    # #      ##### 
#    # #    # #    # #    # #      #   # 
 ####  #    # #    # #####  ###### #    #
\`\`\``;

    try {
        // Send sample font preview first
        await sock.sendMessage(from, { text: previewText }, { quoted: msg });

        // Then send full .txt file if it exists
        if (fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);

            await sock.sendMessage(from, {
                document: fileBuffer,
                fileName: 'fonts-preview.txt',
                mimetype: 'text/plain',
                caption: '📄 *Full font preview file with all styles included.*'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, {
                text: '⚠️ *Full font preview file not found. Only sample preview sent.*'
            }, { quoted: msg });
        }

    } catch (error) {
        console.error("Error in fonts command:", error);
        await sock.sendMessage(from, {
            text: `❌ *Oops! Something went wrong while loading fonts.*\n\n_Error:_ ${error.message || error}`,
            quoted: msg
        });
    }
}

export const description = "Preview cool figlet fonts + get full static preview as .txt";
export const category = "fun";

fonts.description = "Preview cool figlet fonts + get full static preview as .txt";
fonts.category = "funny";