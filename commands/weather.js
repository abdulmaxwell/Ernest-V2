import axios from 'axios';

const weather = async (sock, msg, from, args = []) => {
    try {
        if (args.length === 0) {
            return sock.sendMessage(from, {
                text: '❌ Please provide a location\nExample: !weather London',
                quoted: msg
            });
        }

        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) {
            return sock.sendMessage(from, {
                text: '❌ Weather API key not configured',
                quoted: msg
            });
        }

        const location = args.join(' ');
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;

        const response = await axios.get(url);
        const data = response.data;

        const weatherText = `
╔════════════════════════════╗
║        🌦️ WEATHER          ║
╠════════════════════════════╣
║ Location: ${data.name.padEnd(18)} ║
║ Temp: ${data.main.temp}°C (Feels: ${data.main.feels_like}°C) ║
║ Condition: ${data.weather[0].description.padEnd(12)} ║
║ Humidity: ${data.main.humidity}%           ║
║ Wind: ${data.wind.speed} m/s        ║
╚════════════════════════════╝
        `.trim();

        await sock.sendMessage(from, { text: weatherText }, { quoted: msg });

    } catch (error) {
        console.error('Error in weather:', error);
        let errorMsg = '❌ Failed to get weather data';
        if (error.response?.status === 404) {
            errorMsg = '❌ Location not found';
        }
        await sock.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
};

weather.description = "Get the current weather for a location";
weather.category = "utility";

export default weather;
