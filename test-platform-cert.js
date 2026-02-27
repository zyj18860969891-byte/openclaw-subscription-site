const crypto = require('crypto');

// 测试证书格式
function testPlatformCertFormat(cert) {
  console.log('=== 测试微信支付平台证书格式 ===\n');
  
  if (!cert) {
    console.log('❌ WECHAT_PLATFORM_CERT 环境变量未设置');
    return;
  }
  
  console.log('证书内容长度:', cert.length);
  console.log('证书内容预览:', cert.substring(0, 100) + '...\n');
  
  // 检查是否包含 PEM 格式标记
  const hasBeginMarker = cert.includes('-----BEGIN');
  const hasEndMarker = cert.includes('-----END');
  
  console.log('包含 BEGIN 标记:', hasBeginMarker ? '✅' : '❌');
  console.log('包含 END 标记:', hasEndMarker ? '✅' : '❌');
  
  if (!hasBeginMarker || !hasEndMarker) {
    console.log('\n❌ 错误：证书格式不正确！');
    console.log('微信支付平台证书必须是 PEM 格式的公钥证书');
    console.log('格式示例：');
    console.log('-----BEGIN PUBLIC KEY-----');
    console.log('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...');
    console.log('-----END PUBLIC KEY-----');
    return;
  }
  
  // 尝试解析证书
  try {
    const certObj = crypto.createCertificate(cert);
    console.log('\n✅ 证书解析成功！');
    console.log('证书主题:', certObj.subject);
    console.log('证书颁发者:', certObj.issuer);
    console.log('证书有效期:', certObj.validFrom, '-', certObj.validTo);
    
    // 检查序列号
    const serialNumber = certObj.serialNumber;
    console.log('证书序列号:', serialNumber);
    
    // 检查是否与提供的序列号匹配
    const providedSerial = '2C3B40FD335851A32371C37960634A1D945C09AB';
    if (serialNumber.toUpperCase() === providedSerial.toUpperCase()) {
      console.log('✅ 序列号匹配！');
    } else {
      console.log('⚠️ 序列号不匹配');
      console.log('提供的序列号:', providedSerial);
      console.log('证书序列号:', serialNumber);
    }
    
  } catch (error) {
    console.log('\n❌ 证书解析失败:', error.message);
    console.log('可能的原因：');
    console.log('1. 证书格式不正确');
    console.log('2. 证书内容不完整');
    console.log('3. 证书不是有效的 PEM 格式');
  }
}

// 测试示例证书格式
function testExampleCert() {
  console.log('\n=== 示例证书格式测试 ===\n');
  
  const exampleCert = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjtYxGsd7ta0eh/ggmpQhhBmWjhcPy9g1dtcxWTWuYIBglhrshc2pL91SEOxcdz5BRwcJmmANWWl+bf3wFKpoABZa35s5lA/r1g6HW81sHEl+Ighg1z5MPYy4rZ61dbTEpyUyEagNuxt3zB+L0Qbz6SzWgj/rOWOZC90LF3eD7NyjH6i+T879LXUAz/45BHTKg+74Xos9mb6ucEftKVMyDERjI4Y4abUX0dj4pv4nosGn67nxMn/krSIIxvSfJvm09alnCUb8mkhW16qD1mXDjL02dncg5NHPYw00JmpJs2Ius7JBuLTqgM2mC8Y5RK/EtOmL71W35SeHyoFSl5kBCwIDAQAB
-----END PUBLIC KEY-----`;
  
  testPlatformCertFormat(exampleCert);
}

// 主函数
function main() {
  // 从环境变量获取证书
  const platformCert = process.env.WECHAT_PLATFORM_CERT;
  
  if (platformCert) {
    testPlatformCertFormat(platformCert);
  } else {
    console.log('⚠️ WECHAT_PLATFORM_CERT 环境变量未设置');
    console.log('使用示例证书进行测试...\n');
    testExampleCert();
  }
}

main();