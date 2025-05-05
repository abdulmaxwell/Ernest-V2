import figlet from 'figlet';

export default async function ascii(sock, msg, from, args = []) {
    try {
        if (args.length === 0) {
            return sock.sendMessage(from, { 
                text: '❌ Please provide text\nExample: !ascii Hello',
                quoted: msg 
            });
        }

        const text = args.join(' ');
        const asciiArt = await new Promise((resolve, reject) => {
            figlet.text(text, {
                font: 'Standard',
                horizontalLayout: 'default',
                verticalLayout: 'default'
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        const asciiBox = `
╔════════════════════════════╗
║        🎨 ASCII ART        ║
╠════════════════════════════╣
${asciiArt.split('\n').map(line => `║ ${line.padEnd(24)} ║`).join('\n')}
╚════════════════════════════╝
`.trim();

        await sock.sendMessage(from, { text: asciiBox }, { quoted: msg });
    } catch (error) {
        console.error('Error in ascii:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to generate ASCII art',
            quoted: msg 
        });
    }
}

export const description = "Converts text to ASCII art";