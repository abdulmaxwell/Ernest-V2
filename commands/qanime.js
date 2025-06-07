import axios from 'axios';
import * as cheerio from 'cheerio';

// Core anime quotes function
async function getAnimeQuotes() {
    return new Promise((resolve, reject) => {
        const page = Math.floor(Math.random() * 184);
        axios.get(`https://otakotaku.com/quote/feed/${page}`).then(({ data }) => {
            const $ = cheerio.load(data);
            const quotes = [];
            
            $("div.kotodama-list").each(function (i, element) {
                quotes.push({
                    'link': $(element).find('a').attr("href"),
                    'gambar': $(element).find("img").attr("data-src"),
                    'karakter': $(element).find('div.char-name').text().trim(),
                    'anime': $(element).find("div.anime-title").text().trim(),
                    'episode': $(element).find("div.meta").text(),
                    'up_at': $(element).find('small.meta').text(),
                    'quotes': $(element).find("div.quote").text().trim()
                });
            });
            
            resolve(quotes);
        }).catch(reject);
    });
}

// Main command function
export default async function quotesanime(sock, msg, from) {
    try {
        await sock.sendMessage(from, { text: '🎌 Getting anime quote...' });
        
        const quotes = await getAnimeQuotes();
        
        if (quotes.length === 0) {
            await sock.sendMessage(from, { text: '❌ No quotes found. Please try again.' });
            return;
        }

        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        let response = `🎌 *Anime Quote*\n\n`;
        response += `"${randomQuote.quotes}"\n\n`;
        response += `👤 *Character:* ${randomQuote.karakter || 'Unknown'}\n`;
        response += `📺 *Anime:* ${randomQuote.anime || 'Unknown'}\n`;
        if (randomQuote.episode) {
            response += `📋 *Episode:* ${randomQuote.episode}\n`;
        }
        if (randomQuote.up_at) {
            response += `📅 *Posted:* ${randomQuote.up_at}`;
        }
        
        if (randomQuote.gambar && randomQuote.gambar !== '') {
            try {
                await sock.sendMessage(from, { 
                    image: { url: randomQuote.gambar }, 
                    caption: response 
                });
            } catch (imageError) {
                // If image fails, send text only
                await sock.sendMessage(from, { text: response });
            }
        } else {
            await sock.sendMessage(from, { text: response });
        }
    } catch (error) {
        console.error('QuotesAnime error:', error);
        await sock.sendMessage(from, { text: '❌ Failed to get anime quote. Please try again.' });
    }
}

quotesanime.description = "Get random anime quotes";
quotesanime.emoji = "🎌";
quotesanime.category ="anime";