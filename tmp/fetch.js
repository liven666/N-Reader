const https = require('https');

https.get('https://api.github.com/search/code?q=__lib=forum_favor+repo:soarqin/NGA-BBS-Client', {
  headers: {
    'User-Agent': 'Node.js'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
