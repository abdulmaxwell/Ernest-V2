import chalk from "chalk";

const color = (text, colorName) => {
  return !colorName ? chalk.green(text) : chalk.keyword(colorName)(text);
};

const bgcolor = (text, bgColorName) => {
  return !bgColorName ? chalk.green(text) : chalk.bgKeyword(bgColorName)(text);
};

export default async function colortext(sock, msg, from) {
  const args = msg.body.split(' ').slice(1);
  
  if (args.length < 1) {
    await sock.sendMessage(from, { 
      text: '🎨 *Color Text Command*\n\n' +
            '📝 Usage:\n' +
            '/colortext [text] - Green text (default)\n' +
            '/colortext [text] [color] - Custom color text\n' +
            '/colortext [text] bg [bgcolor] - Text with background color\n\n' +
            '🌈 Available colors:\n' +
            'red, blue, yellow, green, cyan, magenta, white, black, gray, orange, pink, purple\n\n' +
            '💡 Examples:\n' +
            '/colortext Hello World\n' +
            '/colortext Hello World red\n' +
            '/colortext Hello World bg blue'
    });
    return;
  }
  
  const text = args[0];
  const modifier = args[1];
  const colorValue = args[2];
  
  try {
    let coloredText;
    let preview = '';
    
    if (modifier === 'bg' && colorValue) {
      coloredText = bgcolor(text, colorValue);
      preview = `🎨 Text with background color:\n\`\`\`\n${text}\n\`\`\`\n🌈 Background Color: ${colorValue}`;
    } else if (modifier && modifier !== 'bg') {
      coloredText = color(text, modifier);
      preview = `🎨 Colored text:\n\`\`\`\n${text}\n\`\`\`\n🌈 Text Color: ${modifier}`;
    } else {
      coloredText = color(text);
      preview = `🎨 Colored text:\n\`\`\`\n${text}\n\`\`\`\n🌈 Text Color: green (default)`;
    }

    console.log(coloredText);

    await sock.sendMessage(from, { 
      text: preview + '\n\n💡 The colored text has been displayed in the bot console!' 
    });

  } catch (error) {
    await sock.sendMessage(from, { 
      text: '❌ Error applying color. Please check your color name and try again.\n\n' +
            '🌈 Available colors: red, blue, yellow, green, cyan, magenta, white, black, gray, orange, pink, purple' 
    });
  }
}

export const description = "Apply colors to text using chalk (displays in console)";
export const emoji = "🎨";
export const usage = "/colortext [text] [color] or /colortext [text] bg [bgcolor]";
