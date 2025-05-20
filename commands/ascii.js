import figlet from 'figlet';

export default async function ascii(sock, msg, from, args = []) {
    try {
        if (!args.length) {
            return sock.sendMessage(from, {
                text: '❌ Usage: !ascii <font> | <text>\nExample: !ascii Slant | Ernest Bot\nUse !fonts to preview available styles.',
            }, { quoted: msg });
        }

        const input = args.join(' ');
        const [rawFont, ...textParts] = input.includes('|') ? input.split('|') : ['Standard', input];
        const font = rawFont.trim();
        const text = textParts.join('|').trim();

        if (!text) {
            return sock.sendMessage(from, {
                text: '❌ Missing text after font.\nFormat: !ascii <font> | <text>',
            }, { quoted: msg });
        }

        const availableFonts = figlet.fontsSync();
        const fontExists = availableFonts.includes(font);
        const useFont = fontExists ? font : 'Standard';

        const ascii = await new Promise((resolve, reject) => {
            figlet.text(text, {
                font: useFont,
                horizontalLayout: 'default',
                verticalLayout: 'default',
            }, (err, data) => {
                if (err || !data) reject(err || new Error('No data'));
                else resolve(data);
            });
        });

        let message = `🎨 ASCII Art using *${useFont}*${!fontExists ? ' (fallback to Standard)' : ''}\n\n\`\`\`\n${ascii}\n\`\`\``;

        if (ascii.length > 4000) {
            message = '⚠️ Text too long to render in WhatsApp.\nTry shorter input or simpler font.';
        }

        await sock.sendMessage(from, { text: message }, { quoted: msg });

    } catch (error) {
        console.error('❌ ASCII command failed:', error);
        await sock.sendMessage(from, {
            text: '❌ Failed to render ASCII art. Try a different font or shorter text.',
        }, { quoted: msg });
    }
}

export const description = "Make cool ASCII art! Usage: !ascii <font> | <text>";
export const category = "fun";

ascii.description = "Make cool ASCII art! Usage: !ascii <font> | <text>";
ascii.category = "funny";
//works