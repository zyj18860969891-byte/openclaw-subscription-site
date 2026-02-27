const { execSync } = require('child_process');

// 检查环境变量
function checkEnvVars() {
  console.log('=== 检查支付宝环境变量 ===\n');
  
  const envVars = {
    'ALIPAY_APP_ID': process.env.ALIPAY_APP_ID,
    'ALIPAY_PRIVATE_KEY': process.env.ALIPAY_PRIVATE_KEY,
    'ALIPAY_PUBLIC_KEY': process.env.ALIPAY_PUBLIC_KEY,
    'ALIPAY_GATEWAY_URL': process.env.ALIPAY_GATEWAY_URL,
    'ALIPAY_NOTIFY_URL': process.env.ALIPAY_NOTIFY_URL,
  };
  
  let allConfigured = true;
  
  for (const [key, value] of Object.entries(envVars)) {
    if (value && value !== '未设置') {
      console.log(`✅ ${key}: 已设置 (${value.length} 字符)`);
    } else {
      console.log(`❌ ${key}: 未设置`);
      allConfigured = false;
    }
  }
  
  return allConfigured;
}

// 检查 Railway 环境变量
function checkRailwayEnvVars() {
  console.log('\n=== 检查 Railway 环境变量 ===\n');
  
  try {
    const result = execSync('railway variables --json', { encoding: 'utf8' });
    const envVars = JSON.parse(result);
    
    const requiredVars = [
      'ALIPAY_APP_ID',
      'ALIPAY_PRIVATE_KEY',
      'ALIPAY_PUBLIC_KEY',
      'ALIPAY_NOTIFY_URL',
    ];
    
    let allConfigured = true;
    
    requiredVars.forEach(varName => {
      const value = envVars[varName];
      if (value && value !== '未设置') {
        console.log(`✅ ${varName}: 已设置 (${value.length} 字符)`);
      } else {
        console.log(`❌ ${varName}: 未设置`);
        allConfigured = false;
      }
    });
    
    return allConfigured;
  } catch (error) {
    console.log('❌ 无法读取 Railway 环境变量:', error.message);
    return false;
  }
}

// 测试支付宝服务
function testAlipayService() {
  console.log('\n=== 测试支付宝服务 ===\n');
  
  try {
    // 编译 TypeScript
    console.log('正在编译 TypeScript...');
    execSync('npx tsc --noEmit', { encoding: 'utf8' });
    console.log('✅ TypeScript 编译成功');
    
    // 运行测试
    console.log('\n正在运行测试...');
    const testResult = execSync('npm test -- --testPathPattern=alipay', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ 测试运行完成');
    console.log(testResult);
    
    return true;
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    if (error.stdout) {
      console.log('输出:', error.stdout);
    }
    if (error.stderr) {
      console.log('错误:', error.stderr);
    }
    return false;
  }
}

// 主函数
function main() {
  console.log('=== 支付宝服务测试工具 ===\n');
  
  // 1. 检查本地环境变量
  const localConfigured = checkEnvVars();
  
  // 2. 检查 Railway 环境变量
  const railwayConfigured = checkRailwayEnvVars();
  
  // 3. 测试支付宝服务
  const testSuccess = testAlipayService();
  
  // 总结
  console.log('\n=== 测试结果总结 ===');
  console.log(`本地环境变量: ${localConfigured ? '✅ 完整' : '❌ 不完整'}`);
  console.log(`Railway 环境变量: ${railwayConfigured ? '✅ 完整' : '❌ 不完整'}`);
  console.log(`支付宝服务测试: ${testSuccess ? '✅ 通过' : '❌ 失败'}`);
  
  if (localConfigured && railwayConfigured && testSuccess) {
    console.log('\n🎉 支付宝服务配置和测试成功！');
  } else {
    console.log('\n⚠️  部分配置或测试失败，请检查');
  }
}

main().catch(console.error);