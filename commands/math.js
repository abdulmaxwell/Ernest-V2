const { genMath } = require('../lib/mathHandler');

module.exports = {
    name: 'math',
    description: 'Answer a math question based on difficulty level',
    category: 'games',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const quoted = msg;

        const mode = args[0]?.toLowerCase() || 'easy'; // Default to 'easy'
        if (!['noob', 'easy', 'medium', 'hard', 'extreme', 'impossible', 'impossible2'].includes(mode)) {
            return sock.sendMessage(from, {
                text: 'Invalid mode! Valid modes are: noob, easy, medium, hard, extreme, impossible, impossible2',
            }, { quoted });
        }

        const { soal, jawaban, waktu, hadiah } = await genMath(mode);
        
        // Store question state temporarily (use your DB or in-memory object for persistence if needed)
        global.mathQuiz = global.mathQuiz || {};
        global.mathQuiz[from] = {
            answer: jawaban,
            timeout: setTimeout(() => {
                sock.sendMessage(from, {
                    text: `⏰ Time's up! The correct answer was *${jawaban}*.`,
                }, { quoted });
                delete global.mathQuiz[from];
            }, waktu)
        };

        await sock.sendMessage(from, {
            text: `🧮 *Math Challenge (${mode.toUpperCase()})*\n\n${soal}\n\n⏳ *You have ${waktu / 1000} seconds!*\n🎁 *Bonus*: ${hadiah} points\n\n_Reply with your answer now!_`,
        }, { quoted });
    }
};
