import { performance } from 'perf_hooks';

/**
 * 🏆 LEGENDARY TAG ALL COMMAND 🏆
 * Advanced group member tagging system with style
 * 
 * Features:
 * - Smart admin verification
 * - Multiple tagging modes
 * - Beautiful formatting options
 * - Rate limiting & cooldowns
 * - Custom message templates
 * - Performance optimization
 */

class GroupTagger {
  constructor() {
    this.cooldowns = new Map();
    this.templates = new Map();
    this.initializeTemplates();
  }

  initializeTemplates() {
    this.templates.set('announcement', {
      emoji: '📢',
      title: 'GROUP ANNOUNCEMENT',
      style: 'formal'
    });
    
    this.templates.set('meeting', {
      emoji: '🤝',
      title: 'MEETING ALERT',
      style: 'business'
    });
    
    this.templates.set('event', {
      emoji: '🎉',
      title: 'EVENT NOTIFICATION',
      style: 'festive'
    });
    
    this.templates.set('urgent', {
      emoji: '🚨',
      title: 'URGENT NOTICE',
      style: 'alert'
    });
    
    this.templates.set('general', {
      emoji: '💬',
      title: 'GROUP MESSAGE',
      style: 'casual'
    });
  }

  async validateGroupAndAdmin(sock, from, sender) {
    // Validate group chat
    if (!from.endsWith('@g.us')) {
      throw new Error('GROUP_ONLY');
    }

    // Get group metadata with error handling
    let groupMetadata;
    try {
      groupMetadata = await sock.groupMetadata(from);
    } catch (error) {
      throw new Error('METADATA_FETCH_FAILED');
    }

    if (!groupMetadata || !groupMetadata.participants) {
      throw new Error('INVALID_GROUP_DATA');
    }

    // Enhanced admin check
    const senderParticipant = groupMetadata.participants.find(p => p.id === sender);
    
    if (!senderParticipant) {
      throw new Error('SENDER_NOT_FOUND');
    }

    const isAdmin = ['admin', 'superadmin'].includes(senderParticipant.admin);
    const isBotAdmin = groupMetadata.participants.find(p => 
      p.id === sock.user?.id && ['admin', 'superadmin'].includes(p.admin)
    );

    return {
      groupMetadata,
      isAdmin,
      isBotAdmin: !!isBotAdmin,
      senderParticipant
    };
  }

  checkCooldown(sender, groupId) {
    const key = `${sender}_${groupId}`;
    const lastUsed = this.cooldowns.get(key);
    const cooldownTime = 30000; // 30 seconds
    
    if (lastUsed && Date.now() - lastUsed < cooldownTime) {
      const remaining = Math.ceil((cooldownTime - (Date.now() - lastUsed)) / 1000);
      throw new Error(`COOLDOWN_ACTIVE:${remaining}`);
    }
    
    this.cooldowns.set(key, Date.now());
  }

  generateMemberList(participants, style = 'elegant') {
    const activeMembers = participants.filter(p => !p.id.includes('bot'));
    
    switch (style) {
      case 'numbered':
        return activeMembers.map((p, i) => 
          `${String(i + 1).padStart(2, '0')}. @${p.id.split('@')[0]}`
        ).join('\n');
        
      case 'elegant':
        return activeMembers.map(p => 
          `◦ @${p.id.split('@')[0]}`
        ).join('\n');
        
      case 'grouped':
        const admins = activeMembers.filter(p => ['admin', 'superadmin'].includes(p.admin));
        const members = activeMembers.filter(p => !['admin', 'superadmin'].includes(p.admin));
        
        let list = '';
        if (admins.length > 0) {
          list += '👑 **Admins:**\n' + admins.map(p => `  ◦ @${p.id.split('@')[0]}`).join('\n') + '\n\n';
        }
        if (members.length > 0) {
          list += '👥 **Members:**\n' + members.map(p => `  ◦ @${p.id.split('@')[0]}`).join('\n');
        }
        return list;
        
      default:
        return activeMembers.map(p => `🔸 @${p.id.split('@')[0]}`).join('\n');
    }
  }

  createLegendaryMessage(groupMetadata, participants, template, customMessage) {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'full',
      timeStyle: 'short'
    });
    
    const memberCount = participants.filter(p => !p.id.includes('bot')).length;
    const memberList = this.generateMemberList(participants, 'elegant');
    
    const messages = {
      formal: `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃        ${template.emoji} ${template.title} ${template.emoji}        ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🎯 **Attention All Members!**

${customMessage || 'Important announcement for all group members. Please read carefully and acknowledge.'}

╭─── 📊 GROUP STATISTICS ───╮
│ 👥 Total Members: ${memberCount}           │
│ 🏷️  Group: ${groupMetadata.subject}     │
│ 📅 Date: ${timestamp}    │
╰─────────────────────────────╯

╭─── 👥 TAGGED MEMBERS ───╮
${memberList}
╰─────────────────────────╯

✨ *Please respond to confirm receipt* ✨`,

      business: `
╔══════════════════════════════════════╗
║          ${template.emoji} ${template.title} ${template.emoji}          ║
╚══════════════════════════════════════╝

📋 **Professional Notification**

${customMessage || 'This is an official group notification. Your attention is required.'}

🏢 **Meeting Details:**
• 📅 Date: Today
• ⏰ Time: As specified
• 📍 Platform: This Group
• 👥 Attendees: All tagged members

📊 **Participants (${memberCount}):**
${memberList}

🔔 **Action Required:** Please confirm your availability`,

      festive: `
🎊✨🎊✨🎊✨🎊✨🎊✨🎊✨🎊✨🎊
        🎉 ${template.title} 🎉
🎊✨🎊✨🎊✨🎊✨🎊✨🎊✨🎊✨🎊

🎈 **Hey Everyone!** 🎈

${customMessage || 'Exciting news for our amazing group! Get ready for something special! 🌟'}

🎯 **Event Highlights:**
• 🎊 Fun & Entertainment
• 🤝 Community Bonding  
• 🎁 Surprises Await
• 📸 Memorable Moments

👥 **Our Awesome Members (${memberCount}):**
${memberList}

🚀 **Let's make this legendary!** 🚀`,

      alert: `
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
     ⚠️ ${template.title} ⚠️
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

🔥 **IMMEDIATE ATTENTION REQUIRED** 🔥

${customMessage || 'This is an urgent notification that requires immediate response from all members.'}

⚡ **Priority Level:** HIGH
🕐 **Response Time:** ASAP
📢 **Action:** Read & Acknowledge

🎯 **All Members Must Respond (${memberCount}):**
${memberList}

⚠️ **Do not ignore this message** ⚠️`,

      casual: `
╭─────────────────────────────────────╮
│        💬 Hey Everyone! 💬         │
╰─────────────────────────────────────╯

😊 **What's up, awesome people!**

${customMessage || 'Just wanted to get everyone together for a quick chat! 💭'}

🌟 **Our Amazing Group:**
• 👥 ${memberCount} fantastic members
• 🏷️ ${groupMetadata.subject}
• 📅 ${timestamp}

🔖 **Tagging our squad:**
${memberList}

💝 **Thanks for being such an awesome community!** 💝`
    };
    
    return messages[template.style] || messages.casual;
  }

  getErrorMessage(error) {
    const errorMessages = {
      'GROUP_ONLY': '❌ **Group Chat Required**\n\nThis legendary command only works in group chats! 🏰',
      'METADATA_FETCH_FAILED': '❌ **Connection Error**\n\nCouldn\'t fetch group information. Please try again! 🔄',
      'INVALID_GROUP_DATA': '❌ **Data Error**\n\nGroup data seems corrupted. Contact support! 🛠️',
      'SENDER_NOT_FOUND': '❌ **Member Verification Failed**\n\nCouldn\'t verify your membership. Rejoin the group! 👥',
      'ADMIN_REQUIRED': '❌ **Admin Access Required**\n\n🔐 Only group admins can use this legendary command!\n\n*Need admin? Ask a current admin to promote you.* 👑',
    };

    if (error.startsWith('COOLDOWN_ACTIVE:')) {
      const seconds = error.split(':')[1];
      return `⏰ **Cooldown Active**\n\nPlease wait ${seconds} seconds before using this command again!\n\n*This prevents spam and keeps the group peaceful* 🕊️`;
    }

    return errorMessages[error] || `❌ **Unexpected Error**\n\nSomething went wrong: ${error}\n\n*Please try again or report this issue* 🐛`;
  }
}

export default async function tagAll(sock, msg, from, args = []) {
  const tagger = new GroupTagger();
  const executionStart = performance.now();
  
  try {
    // Extract message details
    const sender = msg.key.participant || msg.key.remoteJid;
    const customMessage = args.join(' ').trim();
    const templateType = args[0]?.toLowerCase();
    
    // Validate and get group info
    const { groupMetadata, isAdmin, isBotAdmin } = await tagger.validateGroupAndAdmin(sock, from, sender);
    
    // Check admin permissions
    if (!isAdmin) {
      throw new Error('ADMIN_REQUIRED');
    }
    
    // Check cooldown
    tagger.checkCooldown(sender, from);
    
    // Determine template
    const template = tagger.templates.get(templateType) || tagger.templates.get('general');
    
    // Generate member list and mentions
    const participants = groupMetadata.participants;
    const mentions = participants.map(p => p.id);
    
    // Show typing indicator
    await sock.sendPresenceUpdate('composing', from);
    
    // Simulate realistic typing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create legendary message
    const legendaryMessage = tagger.createLegendaryMessage(
      groupMetadata, 
      participants, 
      template, 
      customMessage
    );
    
    // Send the epic message
    await sock.sendMessage(from, {
      text: legendaryMessage,
      mentions,
      contextInfo: {
        mentionedJid: mentions,
        forwardingScore: 1,
        isForwarded: false
      }
    }, { quoted: msg });
    
    // Performance logging
    const executionTime = (performance.now() - executionStart).toFixed(2);
    console.log(`🏆 Legendary TagAll executed successfully in ${executionTime}ms - Tagged ${mentions.length} members`);
    
  } catch (error) {
    console.error('💥 TagAll error:', error);
    
    const errorMessage = tagger.getErrorMessage(error.message);
    
    await sock.sendMessage(from, {
      text: errorMessage,
      quoted: msg
    });
  }
}

// Enhanced metadata configuration
export const description = "🏆 Legendary group member tagging system with multiple templates and advanced features";
export const category = "Group Management";
export const usage = ".tagall [template] [custom message]";
export const aliases = ["tag", "everyone", "all"];
export const examples = [
  ".tagall - Basic group tag",
  ".tagall announcement Important meeting tomorrow",
  ".tagall event Party time! 🎉",
  ".tagall urgent Need immediate response",
  ".tagall meeting Weekly standup in 10 minutes"
];

// Comprehensive metadata object
export const metadata = {
  name: "Legendary TagAll",
  description: "Advanced group member tagging with beautiful templates",
  category: "Group Management",
  version: "3.0.0",
  author: "Legendary Developer",
  lastUpdated: new Date().toISOString(),
  
  permissions: {
    required: ["admin"],
    level: "group-admin"
  },
  
  cooldown: 30, // seconds
  
  templates: [
    "announcement - Formal announcements",
    "meeting - Business meetings", 
    "event - Fun events & parties",
    "urgent - High priority alerts",
    "general - Casual messages"
  ],
  
  features: [
    "🎨 5 Beautiful message templates",
    "👑 Admin-only access control",
    "⏰ Smart cooldown system",
    "📊 Group statistics display",
    "🚀 Performance optimized",
    "🛡️ Advanced error handling",
    "💬 Custom message support",
    "🎯 Smart member filtering"
  ],
  
  usage_guide: {
    basic: ".tagall",
    with_template: ".tagall [template]",
    with_message: ".tagall [template] [your custom message]",
    available_templates: ["announcement", "meeting", "event", "urgent", "general"]
  }
};