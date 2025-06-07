const modes = {
    noob: [-3, 3, -3, 3, '+-', 15000, 10],
    easy: [-10, 10, -10, 10, '*/+-', 20000, 40],
    medium: [-40, 40, -20, 20, '*/+-', 40000, 150],
    hard: [-100, 100, -70, 70, '*/+-', 60000, 350],
    extreme: [-999999, 999999, -999999, 999999, '*/', 99999, 9999],
    impossible: [-99999999999, 99999999999, -99999999999, 999999999999, '*/', 30000, 35000],
    impossible2: [-999999999999999, 999999999999999, -999, 999, '/', 30000, 50000]
};

const operators = {
    '+': '+',
    '-': '-',
    '*': '×',
    '/': '÷'
};

function randomInt(from, to) {
    if (from > to) [from, to] = [to, from];
    from = Math.floor(from);
    to = Math.floor(to);
    return Math.floor((to - from) * Math.random() + from);
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function genMath(mode) {
    return new Promise((resolve, reject) => {
        let [a1, a2, b1, b2, ops, time, bonus] = modes[mode];
        let a = randomInt(a1, a2);
        let b = randomInt(b1, b2);
        let op = pickRandom([...ops]);
        let result;

        // Ensure division by zero is avoided
        if (op === '/' && b === 0) {
            // Re-generate 'b' until it's not zero for division
            while (b === 0) {
                b = randomInt(b1, b2);
            }
        }
        
        // Use a safe evaluation method or re-implement calculation logic
        // eval() is generally not recommended due to security risks.
        // For simple math, we can do it explicitly.
        switch(op) {
            case '+': result = a + b; break;
            case '-': result = a - b; break;
            case '*': result = a * b; break;
            case '/': 
                // Ensure integer division if needed, or floating point
                result = a / b;
                // If you want integer division for a quiz:
                // result = Math.floor(a / b); 
                // To avoid floating point issues, compare with small epsilon if answer needs to be integer
                break;
            default: reject(new Error('Unknown operator')); return;
        }

        // The original logic `if (op == '/') [a, result] = [result, a];`
        // was likely meant to swap 'a' with 'result' if the operation was division
        // to make the problem `result ${operators[op]} b = a`.
        // This makes the problem `? / b = a` effectively.
        // If the problem should always be `a op b = ?`, then this line should be removed.
        // Assuming the problem is always `a op b = ?`, we keep `a` and `b` as generated.
        
        // If you want the "reverse" division problem (e.g., `? / b = a` or `a / ? = result`),
        // the logic needs to be more specific. For now, assuming standard `a op b = result`.

        const hasil = {
            soal: `${a} ${operators[op]} ${b}`,
            mode: mode,
            waktu: time,
            hadiah: bonus,
            jawaban: result
        };
        
        resolve(hasil);
    });
}

export default async function math(sock, msg, from) {
    // Safely get the message text, checking multiple possible locations
    const messageText = msg.message?.conversation || // For plain text messages
                        msg.message?.extendedTextMessage?.text || // For replies or messages with mentions/links
                        msg.message?.imageMessage?.caption || // For images with captions (less common for math)
                        ''; // Default to empty string if no text is found

    const args = messageText.split(' ').slice(1); // Now messageText is guaranteed to be a string
    const mode = args[0] || 'easy';
    
    // Check if mode exists
    if (!modes[mode]) {
        const availableModes = Object.keys(modes).join(', ');
        await sock.sendMessage(from, { 
            text: `❌ Invalid mode! Available modes: ${availableModes}\n\nExample: /math easy` 
        });
        return;
    }
    
    try {
        const mathProblem = await genMath(mode);
        
        const message = `🧮 *Math Quiz - ${mode.toUpperCase()} Mode*\n\n` +
                        `📝 **Problem:** ${mathProblem.soal}\n` +
                        `⏰ **Time Limit:** ${mathProblem.waktu / 1000}s\n` +
                        `🎁 **Bonus Points:** ${mathProblem.hadiah}\n\n` +
                        `💡 Reply with your answer!\n` +
                        `🔢 **Answer:** ||${mathProblem.jawaban}|| (spoiler)`; // Keep spoiler for debugging/testing
        
        await sock.sendMessage(from, { text: message });
        
        // Optional: You can store the problem in a global object or database
        // to check user answers later. For example:
        // global.mathChallenges = global.mathChallenges || {};
        // global.mathChallenges[from] = {
        //     answer: mathProblem.jawaban,
        //     timestamp: Date.now(),
        //     timeout: mathProblem.waktu
        // };
        
    } catch (error) {
        console.error('Error generating math problem:', error);
        await sock.sendMessage(from, { 
            text: `❌ Error generating math problem: ${error.message}. Please try again!` 
        });
    }
}

math.description = "Generate math problems with different difficulty modes";
math.emoji = "🧮";
math.usage = "/math [mode] - Available modes: noob, easy, medium, hard, extreme, impossible, impossible2";