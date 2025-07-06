export default async function test(sock, msg, from) {
    await sock.sendMessage(from, { text: 'Test command works!' });
}

test.description = "Test command";
test.emoji = "🧪";
test.category = "test";