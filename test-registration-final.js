// 测试注册 API 调用
const testRegistration = async () => {
  const apiUrl = 'https://openclaw-subscription-site-production.up.railway.app/api/auth/register';
  
  const testData = {
    email: 'testuser@example.com',
    password: 'testpassword123',
    name: 'Test User Final'
  };

  console.log('🧪 测试注册 API...');
  console.log('URL:', apiUrl);
  console.log('请求数据:', testData);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 响应状态:', response.status);
    console.log('📋 响应头:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ 错误响应:', errorData);
    } else {
      const data = await response.json();
      console.log('✅ 成功响应:', data);
      
      // 测试登录
      console.log('\n🔐 测试登录...');
      const loginResponse = await fetch('https://openclaw-subscription-site-production.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testData.email,
          password: testData.password
        })
      });

      console.log('📊 登录响应状态:', loginResponse.status);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ 登录成功:', loginData);
      } else {
        const loginError = await loginResponse.json();
        console.error('❌ 登录失败:', loginError);
      }
    }
  } catch (error) {
    console.error('🚫 请求失败:', error);
  }
};

testRegistration();