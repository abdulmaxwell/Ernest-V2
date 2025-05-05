export default async function creator(sock, msg, from) {
    try {
        const creatorBox = `
╔════════════════════════════╗
║        👨‍💻 CREATOR         ║
╠════════════════════════════╣
║ • Name: Ernest Maloba      ║
║ • Skills: Full-Stack Dev   ║
║ • Languages: JS/Python     ║
║ • Projects: 50+            ║
║ • Contact: ernest@dev.com  ║
║ • Philosophy: Code=Art     ║
╚════════════════════════════╝
`.trim();

        await sock.sendMessage(from, { 
            text: creatorBox,
            quoted: msg
        });
    } catch (error) {
        console.error('Error in creator:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to fetch creator info',
            quoted: msg 
        });
    }
}

export const description = "Displays information about the bot creator";