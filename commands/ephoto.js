import * as cheerio from 'cheerio';
import axios from 'axios';
import FormData from 'form-data';


async function createEphotoImage(templateUrl, text) {
    try {
        const formData = new FormData();
        
        // Get the initial page to extract form data
        const initialResponse = await axios.get(templateUrl, {
            headers: {
                'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36"
            }
        });
        
        const $ = cheerio.load(initialResponse.data);
        
        // Extract required form values
        const token = $("input[name=token]").val();
        const buildServer = $("input[name=build_server]").val();
        const buildServerId = $('input[name=build_server_id]').val();
        
        if (!token || !buildServer || !buildServerId) {
            throw new Error('Failed to extract required form data from template page');
        }
        
        // Prepare form data for submission
        formData.append("text[]", text);
        formData.append("token", token);
        formData.append("build_server", buildServer);
        formData.append("build_server_id", buildServerId);
        
        // Submit the form to process the image
        const processResponse = await axios({
            url: templateUrl,
            method: "POST",
            data: formData,
            headers: {
                'Accept': "*/*",
                'Accept-Language': 'en-US,en;q=0.9',
                'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                'cookie': initialResponse.headers['set-cookie']?.join("; "),
                ...formData.getHeaders()
            }
        });
        
        // Parse the response to get form values for final image creation
        const processPage = cheerio.load(processResponse.data);
        const formValueInput = processPage("input[name=form_value_input]").val();
        
        if (!formValueInput) {
            throw new Error('Failed to get form value input from process response');
        }
        
        let formValues = JSON.parse(formValueInput);
        
        // Adjust the form values format
        formValues["text[]"] = formValues.text;
        delete formValues.text;
        
        // Create the final image
        const { data: imageResult } = await axios.post(
            "https://en.ephoto360.com/effect/create-image", 
            new URLSearchParams(formValues), 
            {
                headers: {
                    'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                    'cookie': initialResponse.headers['set-cookie']?.join("; ")
                }
            }
        );
        
        // Return the complete image URL
        return buildServer + imageResult.image;
        
    } catch (error) {
        throw new Error(`Ephoto360 processing failed: ${error.message}`);
    }
}

// Popular Ephoto360 template URLs
const EPHOTO_TEMPLATES = {
    'neon': 'https://en.ephoto360.com/create-neon-light-text-effect-online-429.html',
    'blackpink': 'https://en.ephoto360.com/create-a-blackpink-style-logo-with-members-signatures-810.html',
    'thunder': 'https://en.ephoto360.com/create-thunder-text-effect-online-881.html',
    'matrix': 'https://en.ephoto360.com/matrix-text-effect-154.html',
    'dropwater': 'https://en.ephoto360.com/dropwater-text-effect-872.html',
    'paper': 'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
    'smoke': 'https://en.ephoto360.com/smoke-text-effect-70.html',
    'carved': 'https://en.ephoto360.com/carved-wood-effect-online-680.html',
    'glitch': 'https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html',
    'christmas': 'https://en.ephoto360.com/christmas-snow-text-effect-online-691.html'
};

export default async function ephoto(sock, msg, from) {
    try {
        // Get the message text
        const messageText = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || '';
        
        const args = messageText.split(' ');
        const templateName = args[1]?.toLowerCase();
        const text = args.slice(2).join(' ');
        
        // Show available templates if no arguments provided
        if (!templateName) {
            const templateList = Object.keys(EPHOTO_TEMPLATES).map(name => `• ${name}`).join('\n');
            await sock.sendMessage(from, { 
                text: `🎨 *Ephoto360 Text Effects*\n\n*Usage:* .ephoto <template> <text>\n\n*Available Templates:*\n${templateList}\n\n*Example:* .ephoto neon Hello World` 
            });
            return;
        }
        
        // Check if template exists
        if (!EPHOTO_TEMPLATES[templateName]) {
            const templateList = Object.keys(EPHOTO_TEMPLATES).join(', ');
            await sock.sendMessage(from, { 
                text: `❌ Template "${templateName}" not found!\n\n*Available templates:* ${templateList}` 
            });
            return;
        }
        
        // Check if text is provided
        if (!text) {
            await sock.sendMessage(from, { 
                text: `❌ Please provide text to generate!\n\n*Usage:* .ephoto ${templateName} <your text>` 
            });
            return;
        }
        
        // Send processing message
        await sock.sendMessage(from, { 
            text: `🎨 Creating ${templateName} text effect with "${text}"...\nPlease wait, this may take a few seconds.` 
        });
        
        // Generate the image
        const templateUrl = EPHOTO_TEMPLATES[templateName];
        const imageUrl = await createEphotoImage(templateUrl, text);
        
        // Send the generated image
        await sock.sendMessage(from, {
            image: { url: imageUrl },
            caption: `✨ *${templateName.toUpperCase()} Text Effect*\n📝 Text: "${text}"\n🎨 Generated with Ephoto360`
        });
        
    } catch (error) {
        console.error('Ephoto360 error:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to generate text effect. The service might be temporarily unavailable or the template may have changed.' 
        });
    }
}

ephoto.description = "Create stylish text effects using Ephoto360 templates";
ephoto.emoji = "🎨";

//.ephoto neon Hello World
//.ephoto blackpink My Name
//.ephoto thunder AWESOME
//.ephoto matrix The One
//.ephoto glitch ERROR 404
//.ephoto christmas Merry Xmas
//.ephoto smoke Cool Text
//.ephoto carved Wood Style