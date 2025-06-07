import axios from 'axios';

// Load the API key from environment variables
// It's crucial that `dotenv.config()` is called in your main bot file
// before this command file is imported/executed.
const RADAR_API_KEY = process.env.RADAR_API_KEY;

// Throw an error if the API key is not set, to alert the developer
if (!RADAR_API_KEY) {
    console.error('ERROR: RADAR_API_KEY is not set in environment variables.');
    // You might want to exit the process or disable the command if the key is critical
    // process.exit(1); 
}

// Core distance calculation function using Radar API
async function calculateDistanceWithRadar(from, to) {
    if (!RADAR_API_KEY) {
        throw new Error('Radar API key is missing. Cannot calculate distance.');
    }

    try {
        const response = await axios.get('https://api.radar.io/v1/route/distance', {
            params: {
                origin: from,
                destination: to,
                modes: 'car', // Options: 'car', 'bike', 'foot'. Choose based on your needs.
                units: 'metric' // Options: 'metric' or 'imperial'
            },
            headers: {
                'Authorization': RADAR_API_KEY // Radar uses API key in Authorization header
            }
        });

        const data = response.data;

        // Check for common API response patterns for success/failure
        if (data.routes && data.routes.length > 0 && data.routes[0].distance) {
            const distanceInMeters = data.routes[0].distance; // Distance in meters
            const durationInSeconds = data.routes[0].duration; // Duration in seconds

            // Convert to human-readable format
            const distanceKm = (distanceInMeters / 1000).toFixed(2); // Convert meters to kilometers
            
            const totalMinutes = Math.floor(durationInSeconds / 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            let durationText = "";
            if (hours > 0) {
                durationText += `${hours}h `;
            }
            durationText += `${minutes}min`;

            return {
                distance: `${distanceKm} km`,
                duration: durationText
            };
        } else {
            // Handle cases where API returns OK status but no route is found
            throw new Error('No route found for the given locations. Please check their spelling or existence.');
        }
    } catch (error) {
        console.error('Error calling Radar API:', error.response?.data || error.message);
        let errorMessage = 'Failed to get distance information.';
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                errorMessage += ` Server responded with status ${error.response.status}.`;
                if (error.response.data && error.response.data.error) {
                    errorMessage += ` Error: ${error.response.data.error}`;
                }
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage += ` No response from Radar server. Check network or API endpoint.`;
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage += ` Request setup error: ${error.message}`;
            }
        } else {
            // General JavaScript error or custom error from this function
            errorMessage += ` ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}

// Main command function
export default async function jarak(sock, msg, from) {
    try {
        // Robustly get the message text
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const args = text.split(' ').slice(1); // Remove the command prefix (e.g., "!jarak")
        
        // Expected format: !jarak <from_location> ke <to_location>
        const keIndex = args.indexOf('ke');
        if (keIndex === -1 || keIndex === 0 || keIndex === args.length - 1) {
            await sock.sendMessage(from, { 
                text: '📍 Usage: !jarak <from_location> ke <to_location>\n\nExample: !jarak Jakarta ke Bandung' 
            });
            return;
        }

        const fromLocation = args.slice(0, keIndex).join(' ');
        const toLocation = args.slice(keIndex + 1).join(' ');
        
        // Basic validation for locations
        if (!fromLocation.trim() || !toLocation.trim()) {
             await sock.sendMessage(from, { 
                text: '📍 Please provide valid start and end locations.\n\nExample: !jarak Kenya ke Uganda' 
            });
            return;
        }

        await sock.sendMessage(from, { text: `📍 Calculating distance from *${fromLocation}* to *${toLocation}*... Please wait.` });
        
        // Use the new API function to get distance information
        const distanceInfo = await calculateDistanceWithRadar(fromLocation, toLocation); 
        
        let response = `📍 *Distance Information:*\n\n`;
        response += `*From:* ${fromLocation}\n`;
        response += `*To:* ${toLocation}\n`;
        response += `*Distance:* ${distanceInfo.distance}\n`;
        response += `*Travel Time:* ${distanceInfo.duration}\n\n`;
        response += `✅ Powered by Radar.io`;
        
        await sock.sendMessage(from, { text: response });
        
    } catch (error) {
        console.error('Jarak command handler error:', error);
        // Provide a more user-friendly error message
        await sock.sendMessage(from, { 
            text: `❌ Failed to calculate distance. ${error.message}\n\nPlease check your locations and try again.` 
        });
    }
}

jarak.description = "Calculate distance and travel time between two locations using Radar.io API";
jarak.emoji = "📍";
jarak.usage = "!jarak <from_location> ke <to_location>";