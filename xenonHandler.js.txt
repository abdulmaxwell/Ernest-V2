const axios = require('axios');
const cheerio = require('cheerio');
const vm = require('vm');

async function XeonFb(url) {
  const res = await axios.get(`https://ssyoutube.com/api/ajaxSearch/index`, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'origin': 'https://ssyoutube.com',
      'referer': 'https://ssyoutube.com/',
    },
    data: new URLSearchParams({ query: url }).toString()
  });

  const json = res.data;
  if (!json || !json.result) return [];

  const context = {};
  vm.createContext(context);
  vm.runInContext(json.result, context);

  return context.video || [];
}

async function XeonIgImg(match) {
  const result = [];
  const form = {
    url: match,
    submit: '',
  };

  const { data } = await axios('https://downloadgram.org/', {
    method: 'POST',
    data: form,
  });

  const $ = cheerio.load(data);
  $('#downloadhere > a').each((a, b) => {
    const url = $(b).attr('href');
    if (url) result.push(url);
  });

  return result;
}

module.exports = {
  XeonFb,
  XeonIgImg
};
