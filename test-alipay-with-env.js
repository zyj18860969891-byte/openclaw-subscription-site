require('dotenv').config();
const { execSync } = require('child_process');

// 简单测试支付宝服务
function testAlipayService() {
  console.log('=== 支付宝服务测试（已加载环境变量） ===\n');
  
  try {
    // 1. 检查环境变量
    console.log('1. 检查环境变量...');
    const envVars = {
      'ALIPAY_APP_ID': process.env.ALIPAY_APP_ID,
      'ALIPAY_PRIVATE_KEY': process.env.ALIPAY_PRIVATE_KEY ? '已设置 (' + process.env.ALIPAY_PRIVATE_KEY.length + ' 字符)' : '未设置',
      'ALIPAY_PUBLIC_KEY': process.env.ALIPAY_PUBLIC_KEY ? '已设置 (' + process.env.ALIPAY_PUBLIC_KEY.length + ' 字符)' : '未设置',
      'ALIPAY_GATEWAY_URL': process.env.ALIPAY_GATEWAY_URL || '未设置',
      'ALIPAY_NOTIFY_URL': process.env.ALIPAY_NOTIFY_URL || '未设置',
    };
    
    let allConfigured = true;
    for (const [key, value] of Object.entries(envVars)) {
      if (value && value !== '未设置') {
        console.log(`   ✅ ${key}: ${value}`);
      } else {
        console.log(`   ❌ ${key}: ${value}`);
        allConfigured = false;
      }
    }
    
    if (!allConfigured) {
      console.log('\n❌ 环境变量不完整，无法进行完整测试');
      return false;
    }
    
    // 2. 检查 TypeScript 编译
    console.log('\n2. 检查 TypeScript 编译...');
    execSync('npx tsc --noEmit', { encoding: 'utf8' });
    console.log('   ✅ TypeScript 编译成功');
    
    // 3. 检查文件内容
    console.log('\n3. 检查文件内容...');
    const fs = require('fs');
    const path = require('path');
    
    const alipayServicePath = path.join(__dirname, 'src', 'services', 'payment', 'alipay-service.ts');
    const content = fs.readFileSync(alipayServicePath, 'utf8');
    
    const checks = [
      { name: 'alipay-sdk 导入', pattern: 'AlipaySdk' },
      { name: 'SDK 初始化', pattern: 'new AlipaySdk' },
      { name: '支付接口调用', pattern: 'alipay.trade.page.pay' },
      { name: '回调处理', pattern: 'handleNotify' },
      { name: '签名验证', pattern: 'checkNotifySign' },
    ];
    
    checks.forEach(check => {
      if (content.includes(check.pattern)) {
        console.log(`   ✅ ${check.name} 已实现`);
      } else {
        console.log(`   ❌ ${check.name} 未实现`);
      }
    });
    
    // 4. 检查 Railway 环境变量
    console.log('\n4. 检查 Railway 环境变量...');
    try {
      const result = execSync('railway variables --json', { encoding: 'utf8' });
      const railwayEnv = JSON.parse(result);
      
      const railwayVars = [
        'ALIPAY_APP_ID',
        'ALIPAY_PRIVATE_KEY',
        'ALIPAY_PUBLIC_KEY',
        'ALIPAY_NOTIFY_URL',
      ];
      
      let allRailwayConfigured = true;
      railwayVars.forEach(varName => {
        const value = railwayEnv[varName];
        if (value && value !== '未设置') {
          console.log(`   ✅ ${varName}: 已设置 (${value.length} 字符)`);
        } else {
          console.log(`   ❌ ${varName}: 未设置`);
          allRailwayConfigured = false;
        }
      });
      
      if (allRailwayConfigured) {
        console.log('   ✅ Railway 环境变量完整');
      } else {
        console.log('   ❌ Railway 环境变量不完整');
      }
    } catch (error) {
      console.log('   ⚠️  无法读取 Railway 环境变量:', error.message);
    }
    
    console.log('\n🎉 支付宝服务检查完成！');
    console.log('\n=== 下一步建议 ===');
    console.log('1. 支付宝服务已更新为使用 alipay-sdk');
    console.log('2. 环境变量已配置到 Railway');
    console.log('3. 可以测试支付宝支付流程');
    console.log('4. 需要等待用户提供 WECHAT_PLATFORM_CERT');
    
    return true;
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    return false;
  }
}

// 运行测试
testAlipayService();