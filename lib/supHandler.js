export default async function handler(sock, m) {
  const contacts = [];

  const vcardErnest = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Pease Ernest',
    'ORG:Ernest Tech House',
    'EMAIL:peaseernest8@gmail.com',
    'TEL;type=CELL;type=VOICE;waid=254793859108:+254793859108',
    'NOTE:Ernest Tech House - Support v2.0.1',
    'END:VCARD'
  ].join('\n');
  contacts.push({ vcard: vcardErnest });

  const vcardRola = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Rola (Support)',
    'ORG:Ernest Tech House',
    'TEL;type=CELL;type=VOICE;waid=256756635051:+256756635051',
    'NOTE:Support Agent',
    'END:VCARD'
  ].join('\n');
  contacts.push({ vcard: vcardRola });

  const vcardAsher = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Asher (Support)',
    'ORG:Ernest Tech House',
    'TEL;type=CELL;type=VOICE;waid=256782154150:+256782154150',
    'NOTE:Support Agent',
    'END:VCARD'
  ].join('\n');
  contacts.push({ vcard: vcardAsher });

  await sock.sendMessage(
    m.key.remoteJid,
    {
      contacts: {
        displayName: "Ernest Tech House Support",
        contacts
      }
    },
    { quoted: m }
  );
}
