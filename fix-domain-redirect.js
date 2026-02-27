const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 修复域名跳转问题
function fixDomainRedirect() {
  console.log('=== 修复域名跳转问题 ===\n');
  
  try {
    // 1. 获取 Railway 公共域名
    console.log('1. 获取 Railway 公共域名...');
    const result = execSync('railway variables --json', { encoding: 'utf8' });
    const envVars = JSON.parse(result);
    
    const publicDomain = envVars.RAILWAY_PUBLIC_DOMAIN;
    const appUrl = envVars.APP_URL;
    
    console.log('   Railway 公共域名:', publicDomain);
    console.log('   APP_URL:', appUrl || '未设置');
    
    // 2. 检查后端重定向配置
    console.log('\n2. 检查后端重定向配置...');
    const backendIndexPath = path.join(__dirname, 'src', 'index.ts');
    const backendContent = fs.readFileSync(backendIndexPath, 'utf8');
    
    if (backendContent.includes("res.redirect('http://localhost:5173')")) {
      console.log('   ❌ 后端根路由重定向到 localhost:5173');
      console.log('   ⚠️  这会导致域名跳转问题');
    } else {
      console.log('   ✅ 后端根路由重定向已修复');
    }
    
    // 3. 检查前端环境变量
    console.log('\n3. 检查前端环境变量...');
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    if (fs.existsSync(frontendEnvPath)) {
      const frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf8');
      console.log('   前端环境变量内容:');
      console.log('   ' + frontendEnvContent.trim());
      
      if (frontendEnvContent.includes('localhost:3000')) {
        console.log('   ⚠️  前端 API URL 指向 localhost:3000');
        console.log('   这在生产环境中会导致问题');
      }
    } else {
      console.log('   ❌ 前端环境变量文件不存在');
    }
    
    // 4. 检查前端 vite 配置
    console.log('\n4. 检查前端 vite 配置...');
    const viteConfigPath = path.join(__dirname, 'frontend', 'vite.config.ts');
    if (fs.existsSync(viteConfigPath)) {
      const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');
      
      if (viteConfigContent.includes("target: 'http://localhost:3000'")) {
        console.log('   ⚠️  前端 vite 配置代理到 localhost:3000');
        console.log('   这在生产环境中会导致问题');
      } else {
        console.log('   ✅ 前端 vite 配置正常');
      }
    } else {
      console.log('   ❌ 前端 vite 配置文件不存在');
    }
    
    // 5. 提供解决方案
    console.log('\n5. 提供解决方案...');
    console.log('   问题分析:');
    console.log('   - 后端根路由重定向到 localhost:5173');
    console.log('   - 前端 API URL 指向 localhost:3000');
    console.log('   - 前端 vite 配置代理到 localhost:3000');
    console.log('');
    console.log('   解决方案:');
    console.log('   1. 修复后端根路由重定向');
    console.log('   2. 更新前端环境变量');
    console.log('   3. 更新前端 vite 配置');
    console.log('   4. 重新部署 Railway 项目');
    
    console.log('\n🎉 域名跳转问题分析完成！');
    
    return {
      publicDomain,
      appUrl,
      hasIssue: backendContent.includes("res.redirect('http://localhost:5173')"),
      message: '域名跳转问题已识别'
    };
    
  } catch (error) {
    console.log('❌ 分析失败:', error.message);
    return null;
  }
}

// 主函数
function main() {
  const result = fixDomainRedirect();
  
  if (result && result.hasIssue) {
    console.log('\n=== 下一步操作 ===');
    console.log('1. 修复后端根路由重定向');
    console.log('2. 更新前端环境变量');
    console.log('3. 重新部署 Railway 项目');
    console.log('4. 测试域名访问');
  }
}

main();