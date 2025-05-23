export default async function test(sock, msg) {
  try {
    // Get the chat ID and sender information
    const from = msg.key.remoteJid;
    const sender = msg.pushName || 'User';
    
    // Create a response with read receipt and typing indicators
    await sock.sendPresenceUpdate('composing', from);
    
    // Send the response message
    await sock.sendMessage(from, {
      text: `🤖 *Bot Status Report* 🤖\n\n` +
            `👋 Hello ${sender}! I'm alive and kicking!\n` +
            `🟢 Status: Operational\n` +
            `⚡ Response Time: ${new Date().toLocaleTimeString()}\n\n` +
            `No worries, everything is working perfectly!`,
      mentions: [msg.key.participant || from]
    });
    
    // Send read receipt
    await sock.readMessages([msg.key]);
    
  } catch (error) {
    console.error('Error in test command:', error);
    // Attempt to send error notification if possible
    try {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '⚠️ Bot is online but encountered an error processing your test command'
      });
    } catch (e) {
      console.error('Failed to send error notification:', e);
    }
  }
}

export const description = "Check if the bot is live and responsive";
export const category = "Utility";

// Alternative way to set metadata (choose one approach)
test.description = "Verify bot connectivity and response capability";
test.category = "System";
test.usage = ".test";