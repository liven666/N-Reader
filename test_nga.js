import axios from 'axios';
import iconv from 'iconv-lite';

async function testApi(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'NGA_BBS',
        'Cookie': 'ngaPassportUid=65100000; ngaPassportCid=xxx;' // We don't have real cookies, but maybe we get a different error
      },
      responseType: 'arraybuffer'
    });
    const data = iconv.decode(res.data, 'gbk');
    console.log(url, '=>', data.substring(0, 200));
  } catch (e) {
    console.log(url, '=> ERROR:', e.message);
  }
}

testApi('https://bbs.nga.cn/nuke.php?__lib=forum_favor&__act=forum_favor&action=get&__output=11');
testApi('https://bbs.nga.cn/nuke.php?__lib=forum_favor&__act=get&__output=11');
testApi('https://bbs.nga.cn/nuke.php?__lib=forum_favor&__act=forum_favor&__output=11');
