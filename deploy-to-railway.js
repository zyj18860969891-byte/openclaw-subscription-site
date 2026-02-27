const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 部署到 Railway
function deployToRailway() {
  console.log('=== 部署到 Railway ===\n');
  
  try {
    // 1. 检查 TypeScript 编译
    console.log('1. 检查 TypeScript 编译...');
    execSync('npx tsc --noEmit', { encoding: 'utf8' });
    console.log('   ✅ TypeScript 编译成功');
    
    // 2. 提交代码更改
    console.log('\n2. 提交代码更改...');
    try {
      execSync('git add .', { encoding: 'utf8' });
      console.log('   ✅ 已添加所有更改');
      
      execSync('git commit -m "feat: 更新支付宝服务实现，集成 alipay-sdk"', { encoding: 'utf8' });
      console.log('   ✅ 已提交更改');
    } catch (error) {
      if (error.message.includes('nothing to commit')) {
        console.log('   ⚠️  没有需要提交的更改');
      } else {
        throw error;
      }
    }
    
    // 3. 推送到 GitHub
    console.log('\n3. 推送到 GitHub...');
    try {
      execSync('git push origin main', { encoding: 'utf8' });
      console.log('   ✅ 已推送到 GitHub');
    } catch (error) {
      console.log('   ⚠️  推送失败:', error.message);
      console.log('   请手动推送代码到 GitHub');
    }
    
    // 4. 检查 Railway 部署状态
    console.log('\n4. 检查 Railway 部署状态...');
    try {
      const result = execSync('railway status', { encoding: 'utf8' });
      console.log('   ✅ Railway 状态:');
      console.log(result);
    } catch (error) {
      console.log('   ⚠️  无法检查 Railway 状态:', error.message);
    }
    
    // 5. 创建部署说明
    console.log('\n5. 创建部署说明...');
    const deployInfo = {
      timestamp: new Date().toISOString(),
      changes: [
        '更新支付宝服务实现，集成 alipay-sdk',
        '修复 TypeScript 编译错误',
        '添加 ALIPAY_PUBLIC_KEY 环境变量',
        '同步环境变量到本地 .env 文件',
      ],
      nextSteps: [
        '等待 Railway 自动重新部署',
        '或手动触发重新部署',
        '测试支付宝支付流程',
        '等待用户提供 WECHAT_PLATFORM_CERT',
      ],
      environmentVariables: {
        alipay: {
          ALIPAY_APP_ID: '2021005185689350',
          ALIPAY_PRIVATE_KEY: '已设置 (1624 字符)',
          ALIPAY_PUBLIC_KEY: '已设置 (392 字符)',
          ALIPAY_GATEWAY_URL: 'https://openapi.alipay.com/gateway.do',
          ALIPAY_NOTIFY_URL: 'https://openclaw-subscription-site-production.up.railway.app/api/payment/alipay/notify',
        },
        wechat: {
          WECHAT_APP_ID: 'zyj18860969891',
          WECHAT_MCH_ID: '1725799770',
          WECHAT_APIV3_KEY: '已设置',
          WECHAT_API_KEY: '已设置',
          WECHAT_SERIAL_NO: '2660E9B1BC25E6F60E2FFB294DC42B4C5229EB08',
          WECHAT_NOTIFY_URL: '已设置',
          WECHAT_PRIVATE_KEY: '已设置 (27 字符)',
          WECHAT_PLATFORM_CERT: '未设置',
        },
      },
    };
    
    const deployInfoPath = path.join(__dirname, 'DEPLOYMENT_INFO.json');
    fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
    console.log('   ✅ 部署信息已保存到 DEPLOYMENT_INFO.json');
    
    console.log('\n🎉 部署准备完成！');
    console.log('\n=== 下一步操作 ===');
    console.log('1. 等待 Railway 自动重新部署');
    console.log('2. 或手动触发重新部署');
    console.log('3. 测试支付宝支付流程');
    console.log('4. 等待用户提供 WECHAT_PLATFORM_CERT');
    
    return true;
  } catch (error) {
    console.log('❌ 部署失败:', error.message);
    return false;
  }
}

// 运行部署
deployToRailway();