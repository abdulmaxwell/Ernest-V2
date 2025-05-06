import figlet from 'figlet';

export default async function ascii(sock, msg, from, args = []) {
    try {
        if (!args.length) {
            return sock.sendMessage(from, {
                text: '❌ Usage: !ascii [font] | <text>\nExample: !ascii Slant | Ernest Bot',
                quoted: msg
            });
        }

        const input = args.join(' ');
        const [rawFont, ...textParts] = input.includes('|') ? input.split('|') : ['Standard', input];
        const font = rawFont.trim();
        const text = textParts.join('|').trim();

        if (!text) {
            return sock.sendMessage(from, {
                text: '❌ Please provide the text after the pipe (|)\nExample: !ascii Slant | Ernest',
                quoted: msg
            });
        }

        const availableFonts = figlet.fontsSync();
        const useFont = availableFonts.includes(font) ? font : 'Standard';

        const ascii = await new Promise((resolve, reject) => {
            figlet.text(text, {
                font: useFont,
                horizontalLayout: 'default',
                verticalLayout: 'default'
            }, (err, data) => {
                if (err || !data) reject(err || new Error('No data'));
                else resolve(data);
            });
        });

        await sock.sendMessage(from, {
            text: `🎨 ASCII Art with *${useFont}*\n\n\`\`\`\n${ascii}\n\`\`\``,
            quoted: msg
        });

    } catch (error) {
        console.error('❌ ASCII command failed:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to render ASCII art. Try a different font or text.',
            quoted: msg
        });
    }
}

export const description = "Make cool ASCII art! Use: !ascii <font> | <text>";
