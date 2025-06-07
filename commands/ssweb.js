import axios from 'axios';

// Core screenshot function
async function takeScreenshot(url, device = "desktop") {
    return new Promise((resolve, reject) => {
        const payload = {
            'url': url,
            'device': device,
            'cacheLimit': 0
        };
        
        axios({
            'url': "https://www.screenshotmachine.com/capture.php",
            'method': "POST",
            'data': new URLSearchParams(Object.entries(payload)),
            'headers': {
                'content-type': "application/x-www-form-urlencoded; charset=UTF-8"
            }
        }).then(response => {
            const cookies = response.headers["set-cookie"];
            if (response.data.status === "success") {
                axios.get(`https://www.screenshotmachine.com/${response.data.link}`, {
                    'headers': {
                        'cookie': cookies.join('')
                    },
                    'responseType': "arraybuffer"
                }).then(({ data }) => {
                    resolve({
                        'status': 200,
                        'result': data
                    });
                });
            } else {
                reject({
                    'status': 404,
                    'message': response.data
                });
            }
        }).catch(reject);
    });
}

// Main command function
export default async function ssweb(sock, msg, from) {
    try {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const url = text.split(' ')[1];
        
        if (!url) {
            await sock.sendMessage(from, { 
                text: '📸 Usage: ssweb <url>\n\nExample: ssweb https://google.com' 
            });
            return;
        }

        // Add protocol if missing
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;

        await sock.sendMessage(from, { text: '📸 Taking screenshot...' });
        
        const screenshot = await takeScreenshot(fullUrl);
        
        await sock.sendMessage(from, { 
            image: screenshot.result, 
            caption: `📸 Screenshot of: ${fullUrl}` 
        });
    } catch (error) {
        console.error('Screenshot error:', error);
        await sock.sendMessage(from, { text: '❌ Failed to take screenshot. Please check the URL.' });
    }
}

ssweb.description = "Take screenshot of a website";
ssweb.emoji = "📸";