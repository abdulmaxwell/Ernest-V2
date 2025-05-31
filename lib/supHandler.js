// =============================================================================
// 🏆 LEGENDARY SUPPORT COMMAND SYSTEM 🏆
// Ernest Tech House - Professional Support Contact Manager
// Version: 3.0.0 | Updated: 2025
// =============================================================================

import { performance } from 'perf_hooks';

/**
 * 🌟 LEGENDARY SUPPORT HANDLER 🌟
 * Advanced contact management with beautiful presentation
 */
class SupportContactManager {
  constructor() {
    this.contacts = new Map();
    this.initializeContacts();
  }

  initializeContacts() {
    // Primary Support Contact - Ernest
    this.contacts.set('ernest', {
      name: 'Pease Ernest',
      role: 'Founder & Lead Developer',
      organization: 'Ernest Tech House',
      phone: '+254793859108',
      whatsapp: '254793859108',
      email: 'peaseernest8@gmail.com',
      specialties: ['Bot Development', 'Technical Architecture', 'System Design'],
      availability: '24/7 Emergency Support',
      priority: 1
    });

    // Secondary Support Contact - Praxcedes
    this.contacts.set('praxcedes', {
      name: 'Praxcedes',
      role: 'Support Specialist',
      organization: 'Ernest Tech House',
      phone: '+254757719636',
      whatsapp: '254757719636',
      email: null, // Add if available
      specialties: ['Customer Support', 'Issue Resolution', 'User Assistance'],
      availability: 'Business Hours',
      priority: 2
    });
  }

  generateVCard(contactData) {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contactData.name}`,
      `ORG:${contactData.organization}`,
      contactData.email ? `EMAIL:${contactData.email}` : null,
      `TEL;type=CELL;type=VOICE;waid=${contactData.whatsapp}:${contactData.phone}`,
      `TITLE:${contactData.role}`,
      `NOTE:${contactData.organization} - ${contactData.role} | Specializes in: ${contactData.specialties.join(', ')}`,
      'END:VCARD'
    ].filter(Boolean).join('\n');

    return vcard;
  }

  generateSupportMessage() {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'EAT', // East Africa Time
      dateStyle: 'full',
      timeStyle: 'short'
    });

    return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃        🏢 ERNEST TECH HOUSE SUPPORT 🏢        ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🌟 **Welcome to Premium Support!** 🌟

We're here to provide you with **world-class technical assistance** and ensure your experience is nothing short of **legendary**!

╭─── 👥 OUR SUPPORT TEAM ───╮
│                                    │
│ 🎯 **Pease Ernest**                │
│ 👑 Founder & Lead Developer        │
│ 📱 +254793859108                   │
│ 📧 peaseernest8@gmail.com          │
│ ⚡ 24/7 Emergency Support          │
│ 🎯 Bot Development • Architecture  │
│                                    │
│ 💼 **Praxcedes**                   │
│ 🎧 Support Specialist              │
│ 📱 +254757719636                   │
│ 🕐 Business Hours Support          │
│ 🎯 Customer Care • Issue Resolution│
│                                    │
╰────────────────────────────────────╯

╭─── 🚀 WHAT WE OFFER ───╮
│ ✅ Bot Configuration & Setup       │
│ ✅ Custom Feature Development      │
│ ✅ Technical Troubleshooting       │
│ ✅ Performance Optimization        │
│ ✅ Integration Support             │
│ ✅ 24/7 Emergency Assistance       │
╰────────────────────────────────────╯

╭─── 📞 CONTACT METHODS ───╮
│ 💬 WhatsApp: Instant messaging    │
│ 📞 Voice Call: Direct support     │
│ 📧 Email: Detailed inquiries      │
│ 🤖 Bot Commands: Quick help       │
╰────────────────────────────────────╯

🌟 **Why Choose Ernest Tech House?**
• 🏆 Industry-leading expertise
• ⚡ Lightning-fast response times  
• 💎 Premium quality solutions
• 🛡️ Reliable & trusted support
• 🎯 Personalized assistance

📅 **Support Hours:**
• Ernest: 24/7 Emergency Support
• Praxcedes: Mon-Fri 8AM-6PM EAT

💡 **Pro Tip:** Save these contacts for instant access to our legendary support team!

*${timestamp}*
*Ernest Tech House - Where Technology Meets Excellence* ✨`;
  }

  async sendSupportContacts(sock, m) {
    const contacts = [];
    
    // Generate VCards for all contacts
    for (const [key, contactData] of this.contacts) {
      contacts.push({
        vcard: this.generateVCard(contactData)
      });
    }

    // Send beautiful support message first
    await sock.sendMessage(m.key.remoteJid, {
      text: this.generateSupportMessage()
    }, { quoted: m });

    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send contact cards
    await sock.sendMessage(m.key.remoteJid, {
      contacts: {
        displayName: "🏢 Ernest Tech House Support Team",
        contacts
      }
    }, { quoted: m });
  }
}

// =============================================================================
// 🎯 MAIN SUPPORT HANDLER FUNCTION
// =============================================================================

export default async function handler(sock, m) {
  const startTime = performance.now();
  
  try {
    // Initialize support manager
    const supportManager = new SupportContactManager();
    
    // Show typing indicator for professional feel
    await sock.sendPresenceUpdate('composing', m.key.remoteJid);
    
    // Send support contacts with style
    await supportManager.sendSupportContacts(sock, m);
    
    // Performance logging
    const executionTime = (performance.now() - startTime).toFixed(2);
    console.log(`🏆 Support contacts delivered successfully in ${executionTime}ms`);
    
  } catch (error) {
    console.error('💥 Support handler error:', error);
    
    // Graceful error handling
    const errorMessage = `
╭─────────────────────────────────╮
│     ⚠️ SUPPORT SYSTEM ERROR ⚠️     │
╰─────────────────────────────────╯

🤖 **Temporary Issue Detected**

We're experiencing a minor technical difficulty delivering support contacts.

📞 **Direct Contact Methods:**
• **Ernest:** +254793859108
• **Praxcedes:** +254757719636

📧 **Email:** peaseernest8@gmail.com

*Our legendary support team is always available!* 🌟`;

    await sock.sendMessage(m.key.remoteJid, {
      text: errorMessage
    }, { quoted: m });
  }
}

// =============================================================================
// 🎯 MAIN SUPPORT COMMAND
// =============================================================================

export async function sup(sock, m, args, commandInfo) {
  await handler(sock, m);
}

// Enhanced metadata
export const description = "🏢 Get premium support contacts from Ernest Tech House - Your gateway to legendary technical assistance";
export const category = "Utility";
export const usage = ".sup";
export const aliases = ["support", "contact", "help"];

// Comprehensive metadata object
export const metadata = {
  name: "Legendary Support System",
  description: "Professional support contact management for Ernest Tech House",
  category: "Business Utility",
  version: "3.0.0",
  author: "Ernest Tech House",
  lastUpdated: new Date().toISOString(),
  
  features: [
    "🎨 Beautiful contact presentation",
    "📱 Professional VCard generation", 
    "👥 Multi-contact support team",
    "⚡ Fast response optimization",
    "🛡️ Advanced error handling",
    "📊 Performance monitoring",
    "🌟 Premium user experience"
  ],
  
  contacts: {
    primary: "Pease Ernest - Founder & Lead Developer",
    secondary: "Praxcedes - Support Specialist",
    organization: "Ernest Tech House"
  },
  
  support_hours: {
    ernest: "24/7 Emergency Support",
    praxcedes: "Business Hours (Mon-Fri 8AM-6PM EAT)"
  }
};

// Attach metadata to function
sup.description = description;
sup.category = category;
sup.metadata = metadata;