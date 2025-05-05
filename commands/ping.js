export const pingCommand = async (sock, msg, from) => {
  try {
      const startTime = Date.now();
      const response = `🏓 *Pong!*\n\n` +
                      `⚡ Response Time: _${Date.now() - startTime}ms_\n` +
                      `🤖 _Ernest v2 is awake and responsive!_\n` +
                      `🔥 Powered. Focused. Unstoppable.`;

      await sock.sendMessage(from, { text: response }, { quoted: msg });
  } catch (error) {
      console.error('Error in ping command:', error);
      await sock.sendMessage(from, { 
          text: '❌ An error occurred while processing your request.' 
      }, { quoted: msg });
  }
};