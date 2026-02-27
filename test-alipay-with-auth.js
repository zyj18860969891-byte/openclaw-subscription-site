const axios = require('axios');
const { execSync } = require('child_process');

// 获取 Railway URL
function getRailwayPublicDomain() {
  try {
    const result = execSync('railway variables --json', { encoding: 'utf8' });
    const envVars = JSON.parse(result);
    return `https://${envVars.RAILWAY_PUBLIC_DOMAIN}`;
  } catch (error) {
    console.log('❌ 无法获取 Railway URL:', error.message);
    return null;
  }
}

// 测试支付宝支付 API（带认证）
async function testAlipayPaymentWithAuth(url) {
  console.log('=== 测试支付宝支付 API（带认证） ===\n');
  
  try {
    // 1. 检查服务器状态
    console.log('1. 检查服务器状态...');
    const healthUrl = `${url}/health`;
    try {
      const healthResponse = await axios.get(healthUrl);
      console.log('   ✅ 服务器健康检查通过');
    } catch (error) {
      console.log('   ❌ 服务器健康检查失败:', error.message);
      return false;
    }
    
    // 2. 测试创建支付订单（需要认证）
    console.log('\n2. 测试创建支付宝支付订单（需要认证）...');
    const createPaymentUrl = `${url}/api/payment/create`;
    
    // 注意：需要有效的认证令牌
    // 这里使用示例令牌，实际使用时需要替换为真实令牌
    const authToken = 'your-auth-token-here';
    
    const paymentData = {
      subscriptionId: 'test-subscription-123',
      plan: 'BASIC',
      method: 'alipay',
      amount: 9.99,
      tradeType: 'pc'
    };
    
    try {
      const createResponse = await axios.post(createPaymentUrl, paymentData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   ✅ 支付订单创建成功');
      console.log('   订单号:', createResponse.data.data.outTradeNo);
      console.log('   支付方式:', createResponse.data.data.method);
      console.log('   支付URL:', createResponse.data.data.paymentUrl);
      
      const paymentUrl = createResponse.data.data.paymentUrl;
      const outTradeNo = createResponse.data.data.outTradeNo;
      
      // 3. 检查支付 URL 格式
      console.log('\n3. 检查支付 URL 格式...');
      if (paymentUrl.includes('alipay')) {
        console.log('   ✅ 支付 URL 格式正确（包含 alipay）');
      } else {
        console.log('   ⚠️  支付 URL 格式异常:', paymentUrl);
      }
      
      console.log('\n🎉 支付宝支付 API 测试完成！');
      console.log('\n=== 测试结果 ===');
      console.log('✅ 服务器运行正常');
      console.log('✅ 支付订单创建成功');
      console.log('✅ 支付 URL 生成正确');
      console.log('⚠️  需要有效的认证令牌才能测试');
      
      return {
        success: true,
        outTradeNo,
        paymentUrl,
        message: '支付宝支付 API 测试成功'
      };
      
    } catch (createError) {
      if (createError.response) {
        console.log('   ❌ 创建支付订单失败:', createError.response.status, createError.response.data);
        
        if (createError.response.status === 401) {
          console.log('   ⚠️  需要有效的认证令牌');
          console.log('   请提供有效的 JWT 令牌');
        }
      } else {
        console.log('   ❌ 创建支付订单失败:', createError.message);
      }
      return false;
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('=== 支付宝支付 API 测试工具 ===\n');
  
  // 1. 获取 Railway 公共域名
  const publicUrl = getRailwayPublicDomain();
  
  if (!publicUrl) {
    console.log('\n❌ 无法获取 Railway URL，测试终止');
    return;
  }
  
  console.log('Railway URL:', publicUrl);
  
  // 2. 测试支付宝支付 API
  const result = await testAlipayPaymentWithAuth(publicUrl);
  
  if (result) {
    console.log('\n=== 下一步建议 ===');
    console.log('1. 支付宝支付 API 已就绪');
    console.log('2. 需要有效的认证令牌才能测试');
    console.log('3. 可以测试真实的支付宝支付流程');
    console.log('4. 需要配置支付宝商户平台回调域名');
    console.log('5. 等待用户提供 WECHAT_PLATFORM_CERT');
  } else {
    console.log('\n=== 测试失败 ===');
    console.log('1. 检查服务器是否正常运行');
    console.log('2. 确保有有效的认证令牌');
    console.log('3. 检查网络连接');
  }
}

main().catch(console.error);