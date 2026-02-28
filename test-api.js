const axios = require('axios');

// Railway 部署的 API URL
const API_BASE_URL = 'https://openclaw-subscription-site-production.up.railway.app/api';

async function testAPI() {
  try {
    console.log('🔍 测试 API 连接...');
    
    // 测试健康检查
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ 健康检查成功:', healthResponse.data);
    
    // 测试用户注册
    console.log('🔍 测试用户注册...');
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User'
    };
    
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    console.log('✅ 用户注册成功:', registerResponse.data);
    
    // 测试用户登录
    console.log('🔍 测试用户登录...');
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    console.log('✅ 用户登录成功:', loginResponse.data);
    
  } catch (error) {
    console.error('❌ API 测试失败:', error.message);
    if (error.response) {
      console.error('错误响应:', error.response.status, error.response.data);
    }
  }
}

testAPI();