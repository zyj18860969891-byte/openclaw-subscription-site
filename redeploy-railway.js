const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 重新部署 Railway 项目
function redeployRailway() {
  console.log('=== 重新部署 Railway 项目 ===\n');
  
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
      
      execSync('git commit -m "fix: 修复域名跳转问题，更新前端配置"', { encoding: 'utf8' });
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
        '修复后端根路由重定向问题',
        '更新前端环境变量 VITE_API_URL',
        '更新前端 vite 配置',
        '修复前端 Dockerfile 中的 API 代理',
      ],
      nextSteps: [
        '等待 Railway 自动重新部署',
        '或手动触发重新部署',
        '测试域名访问',
        '验证支付功能',
      ],
      environmentVariables: {
        backend: {
          APP_URL: 'https://openclaw-subscription-site.up.railway.app',
          RAILWAY_PUBLIC_DOMAIN: 'openclaw-subscription-site-production.up.railway.app',
        },
        frontend: {
          VITE_API_URL: '/api',
          BACKEND_URL: 'http://localhost:3000',
        },
      },
    };
    
    const deployInfoPath = path.join(__dirname, 'REDEPLOYMENT_INFO.json');
    fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
    console.log('   ✅ 部署信息已保存到 REDEPLOYMENT_INFO.json');
    
    console.log('\n🎉 重新部署准备完成！');
    console.log('\n=== 下一步操作 ===');
    console.log('1. 等待 Railway 自动重新部署');
    console.log('2. 或手动触发重新部署');
    console.log('3. 测试域名访问');
    console.log('4. 验证支付功能');
    
    return true;
  } catch (error) {
    console.log('❌ 部署失败:', error.message);
    return false;
  }
}

// 运行重新部署
redeployRailway();