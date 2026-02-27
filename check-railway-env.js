const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 检查 Railway CLI 是否安装
function checkRailwayCLI() {
  try {
    const result = execSync('railway --version', { encoding: 'utf8' });
    console.log('✅ Railway CLI 已安装:', result.trim());
    return true;
  } catch (error) {
    console.log('❌ Railway CLI 未安装，请先安装: npm i -g @railway/cli');
    return false;
  }
}

// 连接到 Railway 项目
function connectToRailwayProject() {
  try {
    console.log('\n=== 连接到 Railway 项目 ===');
    
    // 检查当前目录是否有 railway.json
    const railwayJsonPath = path.join(process.cwd(), 'railway.json');
    if (!fs.existsSync(railwayJsonPath)) {
      console.log('❌ 未找到 railway.json 文件');
      return false;
    }
    
    console.log('✅ 找到 railway.json 文件');
    
    // 尝试连接项目
    try {
      const result = execSync('railway link', { encoding: 'utf8' });
      console.log('✅ 已连接到 Railway 项目');
      console.log(result);
      return true;
    } catch (error) {
      console.log('⚠️  连接项目时出错:', error.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 连接 Railway 项目失败:', error.message);
    return false;
  }
}

// 读取 Railway 环境变量
function readRailwayEnvVariables() {
  try {
    console.log('\n=== 读取 Railway 环境变量 ===');
    
    // 使用 railway variables 命令读取环境变量
    const result = execSync('railway variables', { encoding: 'utf8' });
    
    console.log('✅ 成功读取环境变量:');
    console.log(result);
    
    // 解析环境变量
    const lines = result.split('\n');
    const envVars = {};
    
    lines.forEach(line => {
      const match = line.match(/^(\w+)\s+(.+)$/);
      if (match) {
        const key = match[1];
        const value = match[2];
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('❌ 读取环境变量失败:', error.message);
    return null;
  }
}

// 检查支付宝相关环境变量
function checkAlipayEnvVars(envVars) {
  console.log('\n=== 支付宝环境变量检查 ===');
  
  const requiredVars = [
    'ALIPAY_APP_ID',
    'ALIPAY_PRIVATE_KEY',
    'ALIPAY_PUBLIC_KEY',
    'ALIPAY_NOTIFY_URL'
  ];
  
  const optionalVars = [
    'ALIPAY_GATEWAY_URL'
  ];
  
  let allConfigured = true;
  
  // 检查必需变量
  console.log('\n必需变量:');
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    if (value && value !== '未设置') {
      console.log(`✅ ${varName}: 已设置 (${value.length} 字符)`);
    } else {
      console.log(`❌ ${varName}: 未设置`);
      allConfigured = false;
    }
  });
  
  // 检查可选变量
  console.log('\n可选变量:');
  optionalVars.forEach(varName => {
    const value = envVars[varName];
    if (value && value !== '未设置') {
      console.log(`✅ ${varName}: 已设置 (${value})`);
    } else {
      console.log(`⚠️  ${varName}: 未设置 (将使用默认值)`);
    }
  });
  
  return allConfigured;
}

// 检查微信支付环境变量
function checkWechatEnvVars(envVars) {
  console.log('\n=== 微信支付环境变量检查 ===');
  
  const requiredVars = [
    'WECHAT_APP_ID',
    'WECHAT_MCH_ID',
    'WECHAT_PRIVATE_KEY',
    'WECHAT_SERIAL_NO',
    'WECHAT_APIV3_KEY',
    'WECHAT_NOTIFY_URL'
  ];
  
  const optionalVars = [
    'WECHAT_PLATFORM_CERT'
  ];
  
  let allConfigured = true;
  
  // 检查必需变量
  console.log('\n必需变量:');
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    if (value && value !== '未设置') {
      console.log(`✅ ${varName}: 已设置 (${value.length} 字符)`);
    } else {
      console.log(`❌ ${varName}: 未设置`);
      allConfigured = false;
    }
  });
  
  // 检查可选变量
  console.log('\n可选变量:');
  optionalVars.forEach(varName => {
    const value = envVars[varName];
    if (value && value !== '未设置') {
      console.log(`✅ ${varName}: 已设置 (${value.length} 字符)`);
    } else {
      console.log(`⚠️  ${varName}: 未设置 (回调签名验证将被跳过)`);
    }
  });
  
  return allConfigured;
}

// 主函数
async function main() {
  console.log('=== Railway 环境变量检查工具 ===\n');
  
  // 1. 检查 Railway CLI
  if (!checkRailwayCLI()) {
    console.log('\n❌ 请先安装 Railway CLI');
    return;
  }
  
  // 2. 连接到项目
  if (!connectToRailwayProject()) {
    console.log('\n❌ 无法连接到 Railway 项目');
    return;
  }
  
  // 3. 读取环境变量
  const envVars = readRailwayEnvVariables();
  if (!envVars) {
    console.log('\n❌ 无法读取环境变量');
    return;
  }
  
  // 4. 检查支付宝配置
  const alipayConfigured = checkAlipayEnvVars(envVars);
  
  // 5. 检查微信支付配置
  const wechatConfigured = checkWechatEnvVars(envVars);
  
  // 6. 总结
  console.log('\n=== 配置状态总结 ===');
  console.log(`支付宝配置: ${alipayConfigured ? '✅ 完整' : '❌ 不完整'}`);
  console.log(`微信支付配置: ${wechatConfigured ? '✅ 完整' : '❌ 不完整'}`);
  
  if (alipayConfigured && wechatConfigured) {
    console.log('\n🎉 所有支付配置已完整，可以开始更新支付宝服务实现！');
  } else {
    console.log('\n⚠️  部分配置缺失，请补充后继续');
  }
}

// 运行主函数
main().catch(console.error);