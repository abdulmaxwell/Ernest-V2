import { commandMap } from '../handlers/messageHandler.js';
import { ownerNumber } from '../config.js';

export default async function menu(sock, msg, from, args) {
    try {
        const prefix = process.env.PREFIX || '.';
        const botName = process.env.BOT_NAME || 'Ernest Bot v2';
        const imageUrl = process.env.BOT_IMAGE || 'https://avatars.githubusercontent.com/u/173539960?s=400&v=4';
        
        // Check if user wants specific category or command info
        const query = args?.[0]?.toLowerCase();
        
        if (query === 'help' || query === 'info') {
            return await sendHelpInfo(sock, msg, from, prefix);
        }

        // Get user info
        const userName = msg.pushName || msg.key?.participant?.split('@')[0] || 'User';
        const isGroup = from.endsWith('@g.us');
        const currentTime = new Date().toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Group commands by category with better organization
        const categorized = {};
        const totalCommands = Object.keys(commandMap).length;
        
        for (const [cmd, commandFn] of Object.entries(commandMap)) {
            const description = commandFn.description || 'No description available';
            const category = commandFn.category?.toLowerCase() || 'general';
            
            if (!categorized[category]) {
                categorized[category] = [];
            }
            
            categorized[category].push({ 
                cmd: cmd.toLowerCase(), 
                description: description,
                aliases: commandFn.aliases || []
            });
        }

        // Sort categories by importance
        const categoryOrder = ['general', 'fun', 'utility', 'group', 'owner', 'admin'];
        const sortedCategories = Object.keys(categorized).sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a);
            const bIndex = categoryOrder.indexOf(b);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });

        // Category emojis
        const categoryEmojis = {
            general: '🏠',
            fun: '🎮',
            utility: '🔧',
            group: '👥',
            owner: '👑',
            admin: '⚙️',
            music: '🎵',
            download: '⬇️',
            ai: '🤖',
            tools: '🛠️'
        };

        // Build the menu
        let menuText = '';
        menuText += `╭━━━━━━━❰ *${botName.toUpperCase()}* ❱━━━━━━━╮\n`;
        menuText += `┃             *MENU CARD*             ┃\n`;
        menuText += `┃  ┌─────────────┐  ┌─────────────┐  ┃\n`;
        menuText += `┃  │  🤖 BOT INFO  │  │  📊 USER INFO  │  ┃\n`;
        menuText += `┃  └─────────────┘  └─────────────┘  ┃\n`;
        menuText += `┃  👑 Owner: wa.me/${ownerNumber}         ┃\n`;
        menuText += `┃  👤 User: *${userName}*               ┃\n`;
        menuText += `┃  🕐 Time: *${currentTime}*             ┃\n`;
        menuText += `┃  📱 Chat: ${isGroup ? '*Group Chat*' : '*Private Chat*'} ┃\n`;
        menuText += `┃  ⚙️ Prefix: *${prefix}*                ┃\n`;
        menuText += `┃  📋 Total Commands: *${totalCommands}* ┃\n`;
        menuText += `╰━━━━━━━❰ *COMMANDS* ❱━━━━━━━╮\n\n`;

        for (const category of sortedCategories) {
            const cmds = categorized[category];
            const emoji = categoryEmojis[category] || '📁';
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            
            menuText += `╭────❰ *${emoji} ${categoryName.toUpperCase()}* ❱────╮\n`;
            
            cmds.sort((a, b) => a.cmd.localeCompare(b.cmd));
            
            for (const { cmd, description } of cmds) {
                const commandText = `${prefix}${cmd}`;
                const truncatedDesc = description.length > 40 ? 
                    description.substring(0, 37) + '...' : description;
                
                menuText += `┃ ▸ *${commandText}* - _${truncatedDesc}_\n`;
            }
            menuText += `╰──────────────────────────────╯\n\n`;
        }

        menuText += `╭━━━━━━━❰ *QUICK TIPS* ❱━━━━━━━╮\n`;
        menuText += `┃ • Type *${prefix}help <command>* for details\n`;
        menuText += `┃ • Use *${prefix}menu info* for bot info\n`;
        menuText += `┃ • Commands work in groups & DM\n`;
        menuText += `┃ • Bot updates regularly!\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        menuText += `🚀 *Powered by Ernest Tech House*\n`;
        menuText += `⚡ _Fast • Reliable • Always Improving_\n`;
        menuText += `💬 _Need help? Contact the owner!_`;

        // Send with image
        await sock.sendMessage(from, {
            image: { url: imageUrl },
            caption: menuText,
            contextInfo: {
                externalAdReply: {
                    title: `${botName} - Command Menu`,
                    body: `${totalCommands} commands available • Prefix: ${prefix}`,
                    thumbnailUrl: imageUrl,
                    sourceUrl: `https://wa.me/${ownerNumber}`,
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: msg });

    } catch (error) {
        console.error('❌ Error in menu:', error);
        
        // Fallback text-only menu
        try {
            const fallbackText = `❌ *Menu Loading Error*\n\n` +
                               `🔄 *Quick Command List:*\n` +
                               `• ${process.env.PREFIX || '.'}ping - Test bot\n` +
                               `• ${process.env.PREFIX || '.'}help - Get help\n` +
                               `• ${process.env.PREFIX || '.'}quote - Random quotes\n\n` +
                               `💡 _Full menu temporarily unavailable_\n` +
                               `📞 _Contact: wa.me/${ownerNumber}_`;
            
            await sock.sendMessage(from, { text: fallbackText }, { quoted: msg });
        } catch (fallbackError) {
            console.error('❌ Fallback menu also failed:', fallbackError);
        }
    }
}

// Helper function for help info
async function sendHelpInfo(sock, msg, from, prefix) {
    const helpText = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
                    `┃     🤖 *BOT INFORMATION* 🤖     ┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                    
                    `📋 *Bot Details:*\n` +
                    `• Name: Ernest Bot v2\n` +
                    `• Version: 2.0.0\n` +
                    `• Platform: WhatsApp\n` +
                    `• Language: JavaScript (Node.js)\n\n` +
                    
                    `⚙️ *Features:*\n` +
                    `• Multi-command support\n` +
                    `• Group & private chat ready\n` +
                    `• Regular updates & improvements\n` +
                    `• 24/7 reliability\n\n` +
                    
                    `📝 *How to Use:*\n` +
                    `• All commands start with: *${prefix}*\n` +
                    `• Type *${prefix}menu* to see all commands\n` +
                    `• Type *${prefix}help <command>* for specific help\n\n` +
                    
                    `🆘 *Support:*\n` +
                    `• Owner: wa.me/${ownerNumber}\n` +
                    `• Developer: Ernest Tech House\n` +
                    `• Status: Fully Operational\n\n` +
                    
                    `🚀 _Ready to assist you 24/7!_`;

    await sock.sendMessage(from, { text: helpText }, { quoted: msg });
}

// Enhanced metadata
export const description = "Display comprehensive bot menu with all available commands organized by category";
export const category = "general";

// Legacy support
menu.description = "Show all available commands in organized categories";
menu.category = "general";
menu.usage = `menu [info]`;
menu.example = "menu";
menu.aliases = ["commands", "help", "list"];