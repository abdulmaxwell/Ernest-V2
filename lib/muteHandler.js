export default async function muteHandler(sock, m) {
  const jid = m.key.remoteJid;

  try {
    await sock.chatModify({ mute: 8 * 60 * 60 * 1000 }, jid);
    await sock.sendMessage(jid, { text: "🔇 Chat muted for 8 hours." }, { quoted: m });
  } catch (err) {
    console.error("Mute error:", err);
    await sock.sendMessage(jid, { text: "❌ Failed to mute the chat." }, { quoted: m });
  }
}
