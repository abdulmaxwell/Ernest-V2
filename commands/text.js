module.exports = {
  name: 'text',
  description: 'Send a custom message to all numbers in .env with 7s delay',
  category: 'broadcast',
  async execute(sock, msg, args) {
    const textHandler = require('../lib/textHandler');
    await textHandler(sock, msg, msg.key.remoteJid, args);
  }
};
