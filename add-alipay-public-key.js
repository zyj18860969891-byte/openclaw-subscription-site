const { execSync } = require('child_process');

// 支付宝公钥
const alipayPublicKey = `MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjtYxGsd7ta0eh/ggmpQhhBmWjhcPy9g1dtcxWTWuYIBglhrshc2pL91SEOxcdz5BRwcJmmANWWl+bf3wFKpoABZa35s5lA/r1g6HW81sHEl+Ighg1z5MPYy4rZ61dbTEpyUyEagNuxt3zB+L0Qbz6SzWgj/rOWOZC90LF3eD7NyjH6i+T879LXUAz/45BHTKg+74Xos9mb6ucEftKVMyDERjI4Y4abUX0dj4pv4nosGn67nxMn/krSIIxvSfJvm09alnCUb8mkhW16qD1mXDjL02dncg5NHPYw00JmpJs2Ius7JBuLTqgM2mC8Y5RK/EtOmL71W35SeHyoFSl5kBCwIDAQAB`;

// 添加环境变量到 Railway
function addAlipayPublicKey() {
  try {
    console.log('正在添加 ALIPAY_PUBLIC_KEY 到 Railway...');
    
    // 使用 railway variables --set 命令
    const result = execSync(`railway variables --set "ALIPAY_PUBLIC_KEY=${alipayPublicKey}"`, { 
      encoding: 'utf8' 
    });
    
    console.log('✅ 成功添加 ALIPAY_PUBLIC_KEY');
    console.log('结果:', result);
    
    // 验证添加是否成功
    console.log('\n正在验证环境变量...');
    const verifyResult = execSync('railway variables --json', { 
      encoding: 'utf8' 
    });
    const envVars = JSON.parse(verifyResult);
    const publicKey = envVars.ALIPAY_PUBLIC_KEY;
    if (publicKey) {
      console.log('✅ ALIPAY_PUBLIC_KEY 已设置 (', publicKey.length, '字符)');
    } else {
      console.log('❌ ALIPAY_PUBLIC_KEY 未找到');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 添加环境变量失败:', error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('=== Railway 支付宝公钥配置工具 ===\n');
  
  // 确认添加
  console.log('即将添加以下支付宝公钥:');
  console.log('变量名: ALIPAY_PUBLIC_KEY');
  console.log('值长度:', alipayPublicKey.length, '字符');
  console.log('值预览:', alipayPublicKey.substring(0, 50) + '...\n');
  
  // 这里可以添加交互确认，但为了自动化直接执行
  const success = addAlipayPublicKey();
  
  if (success) {
    console.log('\n🎉 ALIPAY_PUBLIC_KEY 配置成功！');
  } else {
    console.log('\n❌ 配置失败，请手动在 Railway 控制台添加');
  }
}

main();