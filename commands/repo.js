// =============================================================================
// 🏆 LEGENDARY REPOSITORY SHOWCASE COMMAND 🏆
// Ernest Tech House - Professional Bot Repository Display
// Version: 3.0.0 | Built with 💎 and ⚡
// =============================================================================

import dotenv from "dotenv";
import { performance } from 'perf_hooks';

dotenv.config();

/**
 * 🌟 LEGENDARY REPOSITORY MANAGER 🌟
 * Advanced repository information display system
 */
class RepositoryShowcase {
  constructor() {
    this.repoData = {
      name: "Ernest V2",
      fullName: "Ernest-V2",
      organization: "Ernest Tech House",
      creator: "Ernest the Legend",
      version: "2.0.0",
      status: "Production Ready",
      language: "JavaScript/Node.js",
      framework: "Baileys WhatsApp API",
      features: [
        "Advanced Command System",
        "Multi-Platform Support", 
        "Real-time Processing",
        "Scalable Architecture",
        "Professional UI/UX",
        "24/7 Reliability"
      ],
      stats: {
        commands: "50+",
        uptime: "99.9%",
        users: "1000+",
        performance: "Lightning Fast"
      }
    };
    
    this.links = {
      github: "https://github.com/PeaseErnest12287/Ernest-V2",
      docs: "https://ernest.tech/docs",
      support: "https://wa.me/254793859108",
      website: "https://ernest.tech",
      demo: "https://demo.ernest.tech"
    };
    
    this.images = {
      primary: process.env.BOT_IMAGE || 'https://avatars.githubusercontent.com/u/173539960?s=400&v=4',
      fallback: 'https://via.placeholder.com/400x400/1a1a1a/00ff88?text=Ernest+Tech+House',
      logo: 'https://avatars.githubusercontent.com/u/173539960?s=200&v=4'
    };
  }

  generateLegendaryDescription() {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃          🏢 ERNEST TECH HOUSE PRESENTS          ┃
┃               🤖 ERNEST V2 BOT 🤖               ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🚀 **Welcome to the Future of WhatsApp Automation!**

Built with 💎 **premium technology**, ⚡ **lightning performance**, 
and 🧠 **intelligent design** - this isn't just a bot, 
it's a **complete digital assistant ecosystem**!

╭─── 🔥 PROJECT HIGHLIGHTS ───╮
│ 📛 Name: ${this.repoData.name}                    │
│ 👑 Creator: ${this.repoData.creator}           │  
│ 🏢 Organization: ${this.repoData.organization}  │
│ 📊 Version: ${this.repoData.version}                     │
│ ⚡ Status: ${this.repoData.status}            │
│ 🛠️ Built with: ${this.repoData.language}      │
╰─────────────────────────────────╯

╭─── 🌟 LEGENDARY FEATURES ───╮
${this.repoData.features.map(feature => `│ ✨ ${feature.padEnd(28)} │`).join('\n')}
╰─────────────────────────────────╯

╭─── 📈 IMPRESSIVE STATS ───╮
│ 🎯 Commands: ${this.repoData.stats.commands}                  │
│ ⏱️ Uptime: ${this.repoData.stats.uptime}                    │  
│ 👥 Active Users: ${this.repoData.stats.users}             │
│ 🚀 Performance: ${this.repoData.stats.performance}      │
╰───────────────────────────╯

╭─── 🔗 ESSENTIAL LINKS ───╮
│ 📂 **Repository:**                     │
│ ${this.links.github}   │
│                                        │
│ 📚 **Documentation:**                  │
│ ${this.links.docs}                │
│                                        │
│ 💬 **Get Support:**                    │
│ ${this.links.support}           │
│                                        │
│ 🌐 **Official Website:**               │
│ ${this.links.website}                │
╰────────────────────────────────────────╯

╭─── ⚡ QUICK START GUIDE ───╮
│ 1️⃣ Star the repository ⭐            │
│ 2️⃣ Clone & install dependencies      │  
│ 3️⃣ Configure your settings           │
│ 4️⃣ Deploy & enjoy! 🎉               │
╰───────────────────────────────────────╯

╭─── 🎯 WHY CHOOSE ERNEST V2? ───╮
│ 🏆 Industry-leading performance       │
│ 🛡️ Enterprise-grade security          │
│ 🔧 Easy customization & setup        │
│ 📞 Professional support team         │
│ 🚀 Regular updates & improvements     │
│ 💎 Premium user experience           │
╰───────────────────────────────────────╯

🔮 **"Building the future, one command at a time"**

💡 **Pro Tip:** Join our community for exclusive updates,
advanced tutorials, and direct access to the development team!

───────────────────────────────────────────────────
🕐 Generated: ${timestamp}
⚡ Powered by Ernest Tech House - Where Innovation Meets Excellence
🌟 "Stay curious. Stay sharp. Stay legendary." ✨`;
  }

  generateQuickInfo() {
    return `
🤖 **Ernest V2 Bot Repository**

🔗 **Quick Access:**
• GitHub: ${this.links.github}
• Docs: ${this.links.docs}  
• Support: ${this.links.support}

⭐ **Don't forget to star the repo!** ⭐`;
  }

  async sendWithRetry(sock, from, messageData, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await sock.sendMessage(from, messageData, options);
        return true;
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return false;
  }
}

// =============================================================================
// 🎯 MAIN REPOSITORY COMMAND
// =============================================================================

export default async function repo(sock, msg, from, args = []) {
  const startTime = performance.now();
  const showcase = new RepositoryShowcase();
  
  try {
    // Show typing indicator for professional feel
    await sock.sendPresenceUpdate('composing', from);
    
    // Parse command arguments
    const isQuickMode = args.includes('quick') || args.includes('q');
    const isTextOnly = args.includes('text') || args.includes('t');
    
    // Generate appropriate content
    const repoText = isQuickMode ? 
      showcase.generateQuickInfo() : 
      showcase.generateLegendaryDescription();
    
    // Simulate realistic typing time
    const typingDelay = isQuickMode ? 800 : 2000;
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    
    if (isTextOnly) {
      // Send text-only version
      await showcase.sendWithRetry(sock, from, {
        text: repoText
      }, { quoted: msg });
      
    } else {
      // Send with image (primary method)
      try {
        await showcase.sendWithRetry(sock, from, {
          image: { url: showcase.images.primary },
          caption: repoText,
          contextInfo: {
            externalAdReply: {
              title: "🏢 Ernest Tech House",
              body: "🤖 Ernest V2 - Professional Bot Repository",
              thumbnailUrl: showcase.images.logo,
              sourceUrl: showcase.links.github,
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        }, { quoted: msg });
        
      } catch (imageError) {
        console.warn('Image failed, trying fallback:', imageError.message);
        
        // Fallback to text with link preview
        await showcase.sendWithRetry(sock, from, {
          text: repoText + `\n\n🖼️ *View Repository:* ${showcase.links.github}`,
          contextInfo: {
            externalAdReply: {
              title: "🏢 Ernest Tech House Repository",
              body: "🤖 Click to view on GitHub",
              sourceUrl: showcase.links.github,
              mediaType: 1
            }
          }
        }, { quoted: msg });
      }
    }
    
    // Performance logging
    const executionTime = (performance.now() - startTime).toFixed(2);
    console.log(`🏆 Repository info delivered successfully in ${executionTime}ms`);
    
  } catch (error) {
    console.error('💥 Repository command error:', error);
    
    // Legendary error handling
    const errorMessage = `
╭─────────────────────────────────╮
│     ⚠️ REPOSITORY ACCESS ERROR ⚠️   │
╰─────────────────────────────────╯

🤖 **Temporary Technical Difficulty**

We're experiencing a minor issue fetching repository details.

🔗 **Direct Links:**
• **GitHub:** ${showcase.links.github}
• **Support:** ${showcase.links.support}
• **Docs:** ${showcase.links.docs}

💡 **Try again in a moment, or visit the links above directly!**

*Ernest Tech House - Always innovating* 🌟`;

    await sock.sendMessage(from, {
      text: errorMessage
    }, { quoted: msg });
  }
}

// Enhanced metadata
export const description = "🏢 Showcase Ernest Tech House's legendary bot repository with professional presentation";
export const category = "Bot Information";
export const usage = ".repo [quick|text]";
export const aliases = ["repository", "github", "source", "code"];
export const examples = [
  ".repo - Full repository showcase",
  ".repo quick - Quick info version", 
  ".repo text - Text-only (no image)"
];

// Comprehensive metadata object  
export const metadata = {
  name: "Legendary Repository Showcase",
  description: "Professional bot repository information display",
  category: "Bot Information",
  version: "3.0.0",
  author: "Ernest Tech House",
  lastUpdated: new Date().toISOString(),
  
  features: [
    "🎨 Beautiful ASCII art presentation",
    "📱 Mobile-optimized display",
    "🔗 Smart link integration", 
    "🖼️ Image with fallback support",
    "⚡ Performance optimized",
    "🛡️ Advanced error handling",
    "📊 Comprehensive statistics",
    "🌟 Professional branding"
  ],
  
  modes: {
    full: "Complete repository showcase with all details",
    quick: "Condensed version with essential links",
    text: "Text-only mode without images"
  },
  
  links: {
    github: "https://github.com/PeaseErnest12287/Ernest-V2",
    docs: "https://ernest.tech/docs",
    support: "https://wa.me/254793859108"
  }
};

// Attach metadata to function
repo.category = "Bot Information";
repo.description = description;
repo.metadata = metadata;