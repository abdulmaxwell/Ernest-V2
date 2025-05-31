import axios from 'axios';

const weather = async (sock, msg, from, args = []) => {
    try {
        if (args.length === 0) {
            const helpText = `
🌈✨ *WEATHER WIZARD* ✨🌈

🔮 *Usage:* !weather [location]
🎯 *Examples:*
   • !weather New York
   • !weather Tokyo
   • !weather Paris, France
   • !weather 90210

🌟 Get ready for some weather magic! ⚡
            `.trim();
            return sock.sendMessage(from, { text: helpText }, { quoted: msg });
        }

        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) {
            return sock.sendMessage(from, {
                text: '💥 Oops! Weather magic wand needs an API key! 🪄\nContact admin to configure WEATHER_API_KEY',
                quoted: msg
            });
        }

        // Show loading animation
        await sock.sendMessage(from, { 
            text: '🔮 Casting weather spell... ✨🌪️✨' 
        }, { quoted: msg });

        const location = args.join(' ');
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&cnt=16`;

        const [currentResponse, forecastResponse] = await Promise.all([
            axios.get(currentUrl),
            axios.get(forecastUrl)
        ]);

        const current = currentResponse.data;
        const forecast = forecastResponse.data;

        // Get weather emojis
        const getWeatherEmoji = (condition, temp) => {
            const main = condition.toLowerCase();
            if (main.includes('clear')) return temp > 25 ? '☀️' : '🌤️';
            if (main.includes('cloud')) return '☁️';
            if (main.includes('rain')) return '🌧️';
            if (main.includes('drizzle')) return '🌦️';
            if (main.includes('thunder')) return '⛈️';
            if (main.includes('snow')) return '🌨️';
            if (main.includes('mist') || main.includes('fog')) return '🌫️';
            if (main.includes('wind')) return '💨';
            return '🌤️';
        };

        const getTempEmoji = (temp) => {
            if (temp >= 35) return '🔥';
            if (temp >= 25) return '🌡️';
            if (temp >= 15) return '😊';
            if (temp >= 5) return '🧊';
            return '❄️';
        };

        const getWindEmoji = (speed) => {
            if (speed > 10) return '💨💨💨';
            if (speed > 5) return '💨💨';
            return '💨';
        };

        const mainEmoji = getWeatherEmoji(current.weather[0].main, current.main.temp);
        const tempEmoji = getTempEmoji(current.main.temp);
        const windEmoji = getWindEmoji(current.wind.speed);

        // Get sunrise/sunset
        const sunrise = new Date(current.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        const sunset = new Date(current.sys.sunset * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });

        // Build forecast
        const forecastText = forecast.list.slice(0, 8).map((item, i) => {
            const time = new Date(item.dt * 1000);
            const timeStr = time.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            const emoji = getWeatherEmoji(item.weather[0].main, item.main.temp);
            return `${emoji} ${timeStr}: ${Math.round(item.main.temp)}°C`;
        }).join('\n');

        const weatherText = `
╔═══════════════════════════════════════╗
║           ${mainEmoji} WEATHER MAGIC ${mainEmoji}             ║
╠═══════════════════════════════════════╣
║                                       ║
║ 📍 *${current.name}, ${current.sys.country}*                    
║                                       ║
║ ${tempEmoji} *TEMPERATURE*                      ║
║   Current: *${Math.round(current.main.temp)}°C* (Feels ${Math.round(current.main.feels_like)}°C)    ║
║   Min: ${Math.round(current.main.temp_min)}°C | Max: ${Math.round(current.main.temp_max)}°C           ║
║                                       ║
║ ${mainEmoji} *CONDITION*                        ║
║   ${current.weather[0].description.toUpperCase()}                     ║
║                                       ║
║ 💧 *HUMIDITY*                          ║
║   ${current.main.humidity}% (${current.main.humidity > 70 ? 'Very Humid! 🌊' : current.main.humidity > 50 ? 'Comfortable 😌' : 'Dry 🏜️'})           ║
║                                       ║
║ ${windEmoji} *WIND*                             ║
║   Speed: ${current.wind.speed} m/s                ║
║   ${current.wind.deg ? `Direction: ${current.wind.deg}°` : 'No direction data'}              ║
║                                       ║
║ 🌅 *SUN TIMES*                         ║
║   Sunrise: ${sunrise}                    ║
║   Sunset: ${sunset}                     ║
║                                       ║
║ 👁️ *VISIBILITY*                        ║
║   ${current.visibility ? `${(current.visibility / 1000).toFixed(1)} km` : 'N/A'}                          ║
║                                       ║
║ 🔮 *3-HOUR FORECAST*                   ║
${forecastText.split('\n').map(line => `║ ${line.padEnd(37)} ║`).join('\n')}
║                                       ║
╚═══════════════════════════════════════╝

${getMotivationalMessage(current.main.temp, current.weather[0].main)}

🌟 *Weather powered by OpenWeatherMap* 🌟
        `.trim();

        await sock.sendMessage(from, { text: weatherText }, { quoted: msg });

    } catch (error) {
        console.error('Weather spell failed:', error);
        let errorMsg = '💥 Weather magic failed! The crystal ball is cloudy! 🔮💨';
        
        if (error.response?.status === 404) {
            errorMsg = `🗺️ *LOCATION NOT FOUND!* 🗺️\n\n🔍 "${args.join(' ')}" doesn't exist in our magical weather realm!\n\n✨ Try:\n• Check spelling\n• Use city, country format\n• Use zip codes\n\nExample: *!weather London, UK*`;
        } else if (error.response?.status === 401) {
            errorMsg = '🔐 API key magic spell expired! Contact the weather wizard (admin)! 🧙‍♂️';
        } else if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
            errorMsg = '🌐 The weather spirits are not responding! Check your internet connection! 📡';
        }
        
        await sock.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
};

const getMotivationalMessage = (temp, condition) => {
    const messages = {
        hot: [
            "🔥 It's HOT! Stay hydrated and find some shade! 🌴",
            "☀️ Perfect beach weather! Don't forget sunscreen! 🏖️",
            "🌡️ Sizzling! Time for ice cream and AC! 🍦"
        ],
        warm: [
            "😎 Beautiful weather! Perfect for outdoor activities! 🚶‍♂️",
            "🌞 Lovely day! Great for a picnic or walk! 🧺",
            "✨ Amazing weather! Make the most of it! 🌺"
        ],
        cool: [
            "🧥 A bit chilly! Layer up and enjoy the crisp air! 🍂",
            "☕ Perfect sweater weather! Hot drink time! ☕",
            "🌿 Fresh and cool! Great for a brisk walk! 🚶"
        ],
        cold: [
            "🧊 Brrr! Bundle up warm and stay cozy! 🧣",
            "❄️ Winter vibes! Hot chocolate weather! ☕",
            "🔥 Cold outside! Perfect for staying indoors! 🏠"
        ],
        rainy: [
            "☔ Rainy day vibes! Perfect for reading indoors! 📚",
            "🌧️ Let it rain! Nature's way of washing the world! 🌱",
            "💧 Cozy rain day! Great for movies and tea! 🎬"
        ],
        stormy: [
            "⛈️ Stormy weather! Stay safe indoors! 🏠",
            "🌩️ Thunder and lightning! Nature's light show! ⚡",
            "🌪️ Wild weather! Perfect for storm watching! 👀"
        ]
    };

    let category = 'warm';
    if (temp > 30) category = 'hot';
    else if (temp > 20) category = 'warm';
    else if (temp > 10) category = 'cool';
    else if (temp <= 10) category = 'cold';

    if (condition.toLowerCase().includes('rain')) category = 'rainy';
    if (condition.toLowerCase().includes('thunder')) category = 'stormy';

    const categoryMessages = messages[category];
    return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
};

weather.description = "Get AMAZING weather info with forecasts and style! ⚡";
weather.category = "utility";

export default weather;