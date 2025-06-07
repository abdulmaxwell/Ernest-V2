import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function bukalapak(sock, msg, from) {
    // Safely get the message text, checking multiple possible locations
    const messageText = msg.message?.conversation || // For plain text messages
                        msg.message?.extendedTextMessage?.text || // For replies or messages with mentions/links
                        msg.message?.imageMessage?.caption || // For images with captions (if command is in caption)
                        ''; // Default to empty string if no text is found

    const args = messageText.split(' ').slice(1); // Now messageText is guaranteed to be a string
    
    if (args.length === 0) {
        await sock.sendMessage(from, { text: 'Usage: !bukalapak <product_name>\nExample: !bukalapak laptop gaming' });
        return;
    }
    
    const query = args.join(' ');
    
    try {
        await sock.sendMessage(from, { text: '🛒 Searching BukaLapak products, please wait...' });

        // Encode the query to handle spaces and special characters in the URL
        const encodedQuery = encodeURIComponent(query);

        // It's good practice to send more comprehensive headers to mimic a real browser
        const { data } = await axios.get(`https://www.bukalapak.com/products?from=omnisearch&from_keyword_history=false&search[keywords]=${encodedQuery}&search_source=omnisearch_keyword&source=navbar`, {
            headers: {
                'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
                // 'Referer': 'https://www.bukalapak.com/' // Sometimes a referer helps
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        // Updated selector for product items, as websites change frequently.
        // The original `div.bl-flex-item.mb-8` might be too specific or outdated.
        // We'll try to find common product card elements.
        $('div.product-card').each((index, element) => { // Common product card class
            // Adjust selectors inside this loop based on BukaLapak's current structure
            const productDiv = $(element); // Use the current element as the base for sub-selectors

            // Try to find the image. Some images are lazy-loaded with data-src
            let image = productDiv.find("img.bl-product-card__img").attr("src") || 
                        productDiv.find("img.bl-product-card__img").attr("data-src");
            
            // Skip if no image or a placeholder image is found (optional, refine as needed)
            if (!image || image.includes('placeholder')) {
                return;
            }

            // Ensure the image URL is absolute
            if (image && image.startsWith('//')) {
                image = 'https:' + image;
            } else if (image && !image.startsWith('http')) {
                // If it's a relative path on bukalapak, reconstruct. Unlikely for product images but good to be safe.
                image = `https://www.bukalapak.com${image}`;
            }

            const link = productDiv.find("a.bl-link").attr('href'); // Common link class
            const title = productDiv.find("div.bl-product-card__title").text().trim() ||
                          productDiv.find("p.bl-product-card__description-name a").text().trim(); // Fallback for title
            const price = productDiv.find("p.bl-product-card__price").text().trim() ||
                          productDiv.find("div.bl-product-card__description-price p").text().trim(); // Fallback for price

            // Ratings and sold text can be tricky. Look for common patterns.
            let rating = productDiv.find("span.bl-product-card__rating-text").text().trim();
            if (!rating) rating = productDiv.find("div.bl-product-card__description-rating p").text().trim();
            
            let sold = productDiv.find("span.bl-product-card__sold-text").text().trim();
            if (!sold) sold = productDiv.find("div.bl-product-card__description-rating-and-sold p").text().trim();


            const storeLocation = productDiv.find("span.bl-product-card__location-text").text().trim() ||
                                  productDiv.find("div.bl-product-card__description-store > span:nth-child(1)").text().trim();
            const storeName = productDiv.find("a.bl-product-card__store-name").text().trim() ||
                              productDiv.find("div.bl-product-card__description-store > span > a").text().trim();
            const storeLink = productDiv.find("a.bl-product-card__store-name").attr("href") ||
                              productDiv.find("div.bl-product-card__description-store > span > a").attr("href");

            // Only add if at least a title and link are found to ensure a valid product
            if (title && link) {
                const product = {
                    title: title,
                    rating: rating || "No rating yet", // Default if not found
                    terjual: sold || "Not yet bought", // Default if not found
                    harga: price || "Price not available", // Default if not found
                    image: image,
                    link: link,
                    store: {
                        lokasi: storeLocation || "Unknown Location",
                        nama: storeName || "Unknown Store",
                        link: storeLink || "No store link"
                    }
                };
                products.push(product);
            }
        });

        if (products.length === 0) {
            await sock.sendMessage(from, { text: '❌ No products found for your search query on BukaLapak. The site structure might have changed, or your query returned no results.' });
            return;
        }

        // Send top 3 products
        const maxProducts = Math.min(3, products.length);
        let message = `🛒 *BukaLapak Search Results*\nQuery: *${query}*\n\n`;

        for (let i = 0; i < maxProducts; i++) {
            const product = products[i];
            message += `*${i + 1}. ${product.title}*\n`;
            message += `💰 Price: ${product.harga}\n`;
            message += `⭐ Rating: ${product.rating}\n`;
            message += `📦 Sold: ${product.terjual}\n`;
            message += `🏪 Store: ${product.store.nama}\n`;
            message += `📍 Location: ${product.store.lokasi}\n`;
            message += `🔗 Link: ${product.link}\n\n`;
        }

        message += `Found ${products.length} products total.`;

        // Send with first product image
        if (products[0].image) {
            try {
                await sock.sendMessage(from, {
                    image: { url: products[0].image },
                    caption: message
                });
            } catch (imageSendError) {
                console.error('Error sending product image:', imageSendError);
                await sock.sendMessage(from, { text: message }); // Fallback to text if image fails
            }
        } else {
            await sock.sendMessage(from, { text: message });
        }

    } catch (error) {
        console.error('BukaLapak command error:', error);
        let userErrorMessage = '❌ Error searching BukaLapak. Please try again.';
        if (axios.isAxiosError(error)) {
            if (error.response) {
                userErrorMessage = `❌ BukaLapak server responded with status: ${error.response.status}. It might be blocking automated requests.`;
            } else if (error.request) {
                userErrorMessage = `❌ Network error while connecting to BukaLapak.`;
            }
        } else if (error.message.includes('No products found')) { // Catch custom error message
             userErrorMessage = error.message;
        }
        await sock.sendMessage(from, { text: userErrorMessage });
    }
}

bukalapak.description = "Search for products on BukaLapak";
bukalapak.emoji = "🛒";