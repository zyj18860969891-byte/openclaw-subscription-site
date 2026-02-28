// 测试注册 API 调用
const testRegistration = async () => {
  const apiUrl = 'https://openclaw-subscription-site-production.up.railway.app/api/auth/register';
  
  const testData = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  };

  console.log('Testing registration API...');
  console.log('URL:', apiUrl);
  console.log('Data:', testData);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response:', errorData);
    } else {
      const data = await response.json();
      console.log('Success response:', data);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
};

testRegistration();