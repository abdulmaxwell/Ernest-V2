export const helpCommand = async (sock, msg, from) => {
  await sock.sendMessage(from, { text: '🆘 Commands: ping, help, quote, joke, weather, time, date, echo, math, news, fact, motivate, insult, compliment, gif' }, { quoted: msg });
};
