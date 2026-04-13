// 测试后端服务器
import axios from 'axios';

const API_URL = 'https://ais-pre-c46pdi4rivswi423p2fguj-104340991429.asia-northeast1.run.app/api/nga';

async function testServer() {
  console.log('🧪 正在测试后端服务器...');
  console.log('📍 服务器地址:', API_URL);
  console.log('');

  try {
    const response = await axios.post(API_URL, {
      url: 'https://bbs.nga.cn/thread.php?fid=-7&lite=js',
      method: 'GET'
    });

    console.log('✅ 服务器响应成功！');
    console.log('');
    console.log('📦 响应数据:', JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('🎉 后端服务器工作正常！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testServer();
