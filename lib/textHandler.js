require('dotenv').config();

module.exports = async function textHandler(sock, msg, from, args = []) {
  const numbers = process.env.TARGET_NUMBERS?.split(',').map(n => n.trim());
  const message = args.join(' ');

  if (!message) {
    return await sock.sendMessage(from, {
      text: '❗ Please provide a message. Example:\ntext Hello fam!',
      quoted: msg
    });
  }

  if (!numbers || numbers.length === 0) {
    return await sock.sendMessage(from, {
      text: '⚠️ No numbers found in the .env file (TARGET_NUMBERS).',
      quoted: msg
    });
  }

  for (let i = 0; i < numbers.length; i++) {
    const jid = numbers[i] + '@s.whatsapp.net';

    try {
      await sock.sendMessage(jid, { text: message });
      console.log(`✅ Sent to ${numbers[i]}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${numbers[i]}:`, err);
    }

    if (i < numbers.length - 1) {
      await new Promise(res => setTimeout(res, 7000)); // 7-second delay
    }
  }

  await sock.sendMessage(from, {
    text: `✅ Message sent to ${numbers.length} number(s).`,
    quoted: msg
  });
};
