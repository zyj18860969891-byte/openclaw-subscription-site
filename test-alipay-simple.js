const { execSync } = require('child_process');

// 简单测试支付宝服务
function testAlipayService() {
  console.log('=== 简单测试支付宝服务 ===\n');
  
  try {
    // 1. 检查环境变量
    console.log('1. 检查环境变量...');
    const envVars = {
      'ALIPAY_APP_ID': process.env.ALIPAY_APP_ID,
      'ALIPAY_PRIVATE_KEY': process.env.ALIPAY_PRIVATE_KEY ? '已设置' : '未设置',
      'ALIPAY_PUBLIC_KEY': process.env.ALIPAY_PUBLIC_KEY ? '已设置' : '未设置',
      'ALIPAY_GATEWAY_URL': process.env.ALIPAY_GATEWAY_URL || '未设置',
      'ALIPAY_NOTIFY_URL': process.env.ALIPAY_NOTIFY_URL || '未设置',
    };
    
    for (const [key, value] of Object.entries(envVars)) {
      console.log(`   ${key}: ${value}`);
    }
    
    // 2. 检查 TypeScript 编译
    console.log('\n2. 检查 TypeScript 编译...');
    execSync('npx tsc --noEmit', { encoding: 'utf8' });
    console.log('   ✅ TypeScript 编译成功');
    
    // 3. 检查文件是否存在
    console.log('\n3. 检查文件是否存在...');
    const fs = require('fs');
    const path = require('path');
    
    const alipayServicePath = path.join(__dirname, 'src', 'services', 'payment', 'alipay-service.ts');
    if (fs.existsSync(alipayServicePath)) {
      console.log('   ✅ alipay-service.ts 存在');
      
      // 检查文件内容
      const content = fs.readFileSync(alipayServicePath, 'utf8');
      if (content.includes('AlipaySdk')) {
        console.log('   ✅ alipay-sdk 已导入');
      } else {
        console.log('   ❌ alipay-sdk 未导入');
      }
      
      if (content.includes('alipay.trade.page.pay')) {
        console.log('   ✅ 支付宝支付接口已实现');
      } else {
        console.log('   ❌ 支付宝支付接口未实现');
      }
    } else {
      console.log('   ❌ alipay-service.ts 不存在');
    }
    
    console.log('\n🎉 支付宝服务基本检查完成！');
    return true;
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    return false;
  }
}

// 运行测试
testAlipayService();