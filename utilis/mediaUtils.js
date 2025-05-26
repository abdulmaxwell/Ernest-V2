const { getVideoMeta } = require('tiktok-scraper');
const { fetchJson } = require('../utils/fetcher');
const { promisify } = require('util');
const { instagram, twitter } = require('video-url-link');

const igGetInfo = promisify(instagram.getInfo);
const twtGetInfo = promisify(twitter.getInfo);

// Sticker conversion without sharp
async function convertToSticker(buffer) {
    return {
        packname: 'Ernest',
        author: 'Ernest Tech House',
        type: 'full',
        categories: ['🤩', '🎉'],
        quality: 70,
        background: '#FFFFFF',
        buffer
    };
}

// Social media handlers
const tiktok = (url) => new Promise((resolve, reject) => {
    getVideoMeta(url, { noWaterMark: true, hdVideo: true })
        .then((result) => {
            result.url = result.videoUrlNoWaterMark || result.videoUrl;
            result.NoWaterMark = !!result.videoUrlNoWaterMark;
            resolve(result);
        }).catch(reject);
});

const insta = (url) => new Promise((resolve, reject) => {
    const uri = url.replace(/\?.*$/g, '');
    igGetInfo(uri, {}).then(resolve).catch(reject);
});

const tweet = (url) => new Promise((resolve, reject) => {
    twtGetInfo(url, {}).then(resolve).catch(reject);
});

const facebook = (url) => new Promise((resolve, reject) => {
    const apikey = '3tgDBIOPAPl62b0zuaWNYog2wvRrc4V414AjMi5zdHbU4a';
    fetchJson(`http://keepsaveit.com/api/?api_key=${apikey}&url=${url}`)
        .then((result) => {
            if ([212, 101, 102, 103, 104, 111, 112, 113, 404, 405].includes(result.code)) {
                reject(result.message || 'Error processing Facebook URL');
            } else {
                resolve(result);
            }
        }).catch(reject);
});

module.exports = {
    convertToSticker,
    socialMedia: {
        tiktok,
        insta,
        tweet,
        facebook
    }
};