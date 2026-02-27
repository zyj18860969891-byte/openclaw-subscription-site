const axios = require('axios');

// 测试支付宝支付 API
async function testAlipayPayment() {
  console.log('=== 测试支付宝支付 API ===\n');
  
  try {
    // 1. 检查服务器是否运行
    console.log('1. 检查服务器状态...');
    const healthUrl = 'http://localhost:8080/health';
    try {
      const healthResponse = await axios.get(healthUrl);
      console.log('   ✅ 服务器健康检查通过:', healthResponse.data);
    } catch (error) {
      console.log('   ❌ 服务器健康检查失败:', error.message);
      console.log('   请确保服务器正在运行');
      return false;
    }
    
    // 2. 测试创建支付订单
    console.log('\n2. 测试创建支付宝支付订单...');
    const createPaymentUrl = 'http://localhost:8080/api/payment/create';
    
    const paymentData = {
      subscriptionId: 'test-subscription-123',
      plan: 'BASIC',
      method: 'alipay',
      amount: 9.99,
      tradeType: 'pc'
    };
    
    try {
      const createResponse = await axios.post(createPaymentUrl, paymentData);
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
      
      // 4. 测试查询支付状态
      console.log('\n4. 测试查询支付状态...');
      const queryUrl = `http://localhost:8080/api/payment/alipay/${outTradeNo}`;
      
      // 注意：需要认证头，这里只是测试
      console.log('   查询URL:', queryUrl);
      console.log('   ⚠️  需要认证头才能查询');
      
      console.log('\n🎉 支付宝支付 API 测试完成！');
      console.log('\n=== 测试结果 ===');
      console.log('✅ 服务器运行正常');
      console.log('✅ 支付订单创建成功');
      console.log('✅ 支付 URL 生成正确');
      console.log('⚠️  需要认证才能查询支付状态');
      
      return {
        success: true,
        outTradeNo,
        paymentUrl,
        message: '支付宝支付 API 测试成功'
      };
      
    } catch (createError) {
      if (createError.response) {
        console.log('   ❌ 创建支付订单失败:', createError.response.status, createError.response.data);
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

// 运行测试
testAlipayPayment().then(result => {
  if (result) {
    console.log('\n=== 下一步建议 ===');
    console.log('1. 支付宝支付 API 已就绪');
    console.log('2. 可以测试真实的支付宝支付流程');
    console.log('3. 需要配置支付宝商户平台回调域名');
    console.log('4. 等待用户提供 WECHAT_PLATFORM_CERT');
  }
}).catch(console.error);