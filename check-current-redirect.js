const { execSync } = require('child_process');

// 检查当前重定向逻辑
function checkCurrentRedirect() {
  console.log('=== 检查当前重定向逻辑 ===\n');
  
  try {
    // 1. 获取 Railway 环境变量
    console.log('1. 获取 Railway 环境变量...');
    const result = execSync('railway variables --json', { encoding: 'utf8' });
    const envVars = JSON.parse(result);
    
    const appUrl = envVars.APP_URL;
    const railwayPublicDomain = envVars.RAILWAY_PUBLIC_DOMAIN;
    
    console.log('   APP_URL:', appUrl || '未设置');
    console.log('   RAILWAY_PUBLIC_DOMAIN:', railwayPublicDomain || '未设置');
    
    // 2. 检查重定向逻辑
    console.log('\n2. 检查重定向逻辑...');
    
    // 模拟重定向逻辑
    let finalRedirectUrl;
    if (appUrl && !appUrl.includes('localhost')) {
      finalRedirectUrl = appUrl;
      console.log('   ✅ 使用 APP_URL:', finalRedirectUrl);
    } else if (railwayPublicDomain) {
      finalRedirectUrl = `https://${railwayPublicDomain}`;
      console.log('   ✅ 使用 RAILWAY_PUBLIC_DOMAIN:', finalRedirectUrl);
    } else {
      finalRedirectUrl = 'http://localhost:5173';
      console.log('   ❌ 使用默认值:', finalRedirectUrl);
    }
    
    // 3. 检查是否正确
    console.log('\n3. 检查是否正确...');
    if (finalRedirectUrl.includes('localhost')) {
      console.log('   ❌ 重定向URL包含 localhost，这是错误的！');
      console.log('   应该重定向到 Railway 域名');
    } else if (finalRedirectUrl.includes('railway.app')) {
      console.log('   ✅ 重定向URL正确，指向 Railway 域名');
    } else {
      console.log('   ⚠️  重定向URL未知');
    }
    
    // 4. 检查后端代码
    console.log('\n4. 检查后端代码...');
    const fs = require('fs');
    const path = require('path');
    
    const backendIndexPath = path.join(__dirname, 'src', 'index.ts');
    const backendContent = fs.readFileSync(backendIndexPath, 'utf8');
    
    // 查找重定向逻辑
    const redirectMatch = backendContent.match(/res\.redirect\((.*?)\)/);
    if (redirectMatch) {
      console.log('   找到重定向逻辑:', redirectMatch[0]);
      
      if (backendContent.includes('localhost:5173')) {
        console.log('   ⚠️  后端代码中包含 localhost:5173');
      } else if (backendContent.includes('localhost:3000')) {
        console.log('   ⚠️  后端代码中包含 localhost:3000');
      } else {
        console.log('   ✅ 后端代码中没有硬编码 localhost');
      }
    } else {
      console.log('   ❌ 未找到重定向逻辑');
    }
    
    console.log('\n🎉 检查完成！');
    
    return {
      appUrl,
      railwayPublicDomain,
      finalRedirectUrl,
      hasLocalhost: finalRedirectUrl.includes('localhost')
    };
    
  } catch (error) {
    console.log('❌ 检查失败:', error.message);
    return null;
  }
}

// 主函数
function main() {
  const result = checkCurrentRedirect();
  
  if (result) {
    console.log('\n=== 分析结果 ===');
    console.log('当前重定向URL:', result.finalRedirectUrl);
    console.log('是否包含 localhost:', result.hasLocalhost ? '是 ❌' : '否 ✅');
    
    if (result.hasLocalhost) {
      console.log('\n=== 问题分析 ===');
      console.log('1. APP_URL 可能被设置为 localhost');
      console.log('2. 或者重定向逻辑有问题');
      console.log('3. 需要检查 Railway 环境变量');
    } else {
      console.log('\n=== 状态正常 ===');
      console.log('重定向URL正确，指向 Railway 域名');
    }
  }
}

main();