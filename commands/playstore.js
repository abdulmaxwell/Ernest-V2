import axios from 'axios';
import * as cheerio from 'cheerio';

// Core Play Store search function
async function searchPlayStore(query) {
    try {
        const { data } = await axios.get(`https://play.google.com/store/search?q=${query}&c=apps`);
        const results = [];
        const $ = cheerio.load(data);
        
        $(".ULeU3b > .VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.Y8RQXd > .VfPpkd-aGsRMb > .VfPpkd-EScbFb-JIbuQc.TAQqTe > a").each((i, element) => {
            const link = $(element).attr('href');
            const name = $(element).find(".j2FCNc > .cXFu1 > .ubGTjb > .DdYX5").text();
            const developer = $(element).find(".j2FCNc > .cXFu1 > .ubGTjb > .wMUdtb").text();
            const img = $(element).find(".j2FCNc > img").attr('src');
            const rating = $(element).find(".j2FCNc > .cXFu1 > .ubGTjb > div").attr("aria-label");
            const rating2 = $(element).find(".j2FCNc > .cXFu1 > .ubGTjb > div > span.w2kbF").text();
            const fullLink = "https://play.google.com" + link;
            
            if (name && developer) {
                results.push({
                    'link': fullLink,
                    'nama': name,
                    'developer': developer,
                    'img': img || "https://i.ibb.co/G7CrCwN/404.png",
                    'rate': rating || "No Rate",
                    'rate2': rating2 || "No Rate",
                    'link_dev': `https://play.google.com/store/apps/developer?id=${developer.split(" ").join('+')}`
                });
            }
        });
        
        return results;
    } catch (error) {
        throw error;
    }
}

// Main command function
export default async function playstore(sock, msg, from) {
    try {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ');
        
        if (!query) {
            await sock.sendMessage(from, { 
                text: '🏪 Usage: playstore <app_name>\n\nExample: playstore WhatsApp' 
            });
            return;
        }

        await sock.sendMessage(from, { text: '🏪 Searching Play Store...' });
        
        const results = await searchPlayStore(query);
        
        if (results.length === 0) {
            await sock.sendMessage(from, { text: '❌ No apps found for your search.' });
            return;
        }

        let response = `🏪 Play Store Results for "${query}":\n\n`;
        
        results.slice(0, 5).forEach((app, index) => {
            response += `${index + 1}. *${app.nama}*\n`;
            response += `👨‍💻 Developer: ${app.developer}\n`;
            response += `⭐ Rating: ${app.rate2}\n`;
            response += `🔗 Link: ${app.link}\n\n`;
        });
        
        await sock.sendMessage(from, { text: response });
        
        // Send app icon if available
        if (results[0].img && results[0].img !== "https://i.ibb.co/G7CrCwN/404.png") {
            await sock.sendMessage(from, { 
                image: { url: results[0].img },
                caption: `📱 ${results[0].nama} - Top Result`
            });
        }
    } catch (error) {
        console.error('PlayStore error:', error);
        await sock.sendMessage(from, { text: '❌ Failed to search Play Store. Please try again.' });
    }
}

playstore.description = "Search apps on Google Play Store";
playstore.emoji = "🏪";
playstore.category= "search";