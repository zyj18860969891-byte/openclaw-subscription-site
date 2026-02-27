const { execSync } = require('child_process');

// 等待网络恢复
function waitForNetwork() {
  console.log('=== 等待网络恢复 ===\n');
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`尝试 ${attempts}/${maxAttempts}...`);
    
    try {
      // 尝试连接到 GitHub
      execSync('git ls-remote origin', { encoding: 'utf8' });
      console.log('✅ 网络连接已恢复！');
      return true;
    } catch (error) {
      console.log('❌ 网络连接失败，等待 5 秒...');
      // 等待 5 秒
      const start = Date.now();
      while (Date.now() - start < 5000) {
        // 等待
      }
    }
  }
  
  console.log('❌ 网络连接在 50 秒内未恢复');
  return false;
}

// 主函数
function main() {
  console.log('等待网络恢复...\n');
  
  const networkRestored = waitForNetwork();
  
  if (networkRestored) {
    console.log('\n🎉 网络已恢复，可以推送代码！');
    
    // 尝试推送代码
    try {
      console.log('\n推送代码到 GitHub...');
      execSync('git push origin main', { encoding: 'utf8' });
      console.log('✅ 代码已成功推送到 GitHub');
    } catch (error) {
      console.log('❌ 推送失败:', error.message);
    }
  } else {
    console.log('\n❌ 网络连接问题，请稍后重试');
  }
}

main();