import axios from 'axios';
import { Agent } from 'https';

const fetchJson = async (url, options = {}) => {
    try {
        const { data } = await axios.get(url, {
            httpsAgent: new Agent({ rejectUnauthorized: false }),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36'
            },
            ...options
        });
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

const fetchBuffer = async (url, options) => {
    try {
        const { data } = await axios.get(url, {
            responseType: 'arraybuffer',
            ...options
        });
        return data;
    } catch (error) {
        console.error('Buffer fetch error:', error);
        throw error;
    }
};

export {
    fetchJson,
    fetchBuffer
};