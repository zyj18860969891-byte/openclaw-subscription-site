#!/usr/bin/env node

/**
 * 检查环境变量配置状态
 * 用于核实支付宝和微信支付的配置情况
 */

const requiredEnvVars = {
  // 基础配置
  '基础配置': [
    { name: 'NODE_ENV', required: false },
    { name: 'PORT', required: false },
    { name: 'APP_URL', required: true },
    { name: 'JWT_SECRET', required: true },
    { name: 'JWT_REFRESH_SECRET', required: true },
    { name: 'DATABASE_URL', required: true },
  ],
  
  // 支付宝配置
  '支付宝配置': [
    { name: 'ALIPAY_APP_ID', required: true },
    { name: 'ALIPAY_PRIVATE_KEY', required: true },
    { name: 'ALIPAY_PUBLIC_KEY', required: true },
    { name: 'ALIPAY_GATEWAY_URL', required: false },
    { name: 'ALIPAY_NOTIFY_URL', required: true },
  ],
  
  // 微信支付配置
  '微信支付配置': [
    { name: 'WECHAT_APP_ID', required: true },
    { name: 'WECHAT_MCH_ID', required: true },
    { name: 'WECHAT_API_KEY', required: true },
    { name: 'WECHAT_PRIVATE_KEY', required: true },
    { name: 'WECHAT_SERIAL_NO', required: true },
    { name: 'WECHAT_APIV3_KEY', required: true },
    { name: 'WECHAT_NOTIFY_URL', required: true },
    { name: 'WECHAT_PLATFORM_CERT', required: false }, // 可选但推荐
  ],
  
  // Railway 配置
  'Railway配置': [
    { name: 'RAILWAY_API_TOKEN', required: false },
    { name: 'RAILWAY_TEMPLATE_PROJECT_ID', required: false },
    { name: 'RAILWAY_TEMPLATE_SERVICE_ID', required: false },
    { name: 'RAILWAY_PUBLIC_DOMAIN', required: false },
  ],
};

function checkEnvVars() {
  console.log('🔍 环境变量配置检查\n');
  console.log('=' .repeat(60));
  
  let totalRequired = 0;
  let totalConfigured = 0;
  let missingRequired = [];
  
  for (const [category, vars] of Object.entries(requiredEnvVars)) {
    console.log(`\n📋 ${category}:`);
    console.log('-'.repeat(40));
    
    for (const { name, required } of vars) {
      const value = process.env[name];
      const isSet = value && value.trim() !== '';
      
      if (required && !isSet) {
        missingRequired.push(name);
        totalRequired++;
        console.log(`  ❌ ${name}: 未设置 (必需)`);
      } else if (isSet) {
        totalConfigured++;
        if (required) totalRequired++;
        const displayValue = name.includes('KEY') || name.includes('SECRET') || name.includes('PRIVATE') 
          ? '***已设置***' 
          : value.substring(0, 50) + (value.length > 50 ? '...' : '');
        console.log(`  ✅ ${name}: ${displayValue}`);
      } else {
        console.log(`  ⚪ ${name}: 未设置 (可选)`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 配置统计:');
  console.log(`   必需配置: ${totalRequired}`);
  console.log(`   已配置: ${totalConfigured}`);
  console.log(`   缺失: ${missingRequired.length}`);
  
  if (missingRequired.length > 0) {
    console.log('\n❌ 缺失的必需环境变量:');
    missingRequired.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log('\n✅ 所有必需环境变量已配置！');
  }
  
  // 检查支付宝配置
  console.log('\n' + '='.repeat(60));
  console.log('🔍 支付宝配置详情:');
  const alipayAppId = process.env.ALIPAY_APP_ID;
  const alipayPrivateKey = process.env.ALIPAY_PRIVATE_KEY;
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
  const alipayNotifyUrl = process.env.ALIPAY_NOTIFY_URL;
  
  if (alipayAppId && alipayPrivateKey && alipayPublicKey && alipayNotifyUrl) {
    console.log('✅ 支付宝配置完整');
    console.log(`   App ID: ${alipayAppId}`);
    console.log(`   私钥长度: ${alipayPrivateKey.length} 字符`);
    console.log(`   公钥长度: ${alipayPublicKey.length} 字符`);
    console.log(`   回调地址: ${alipayNotifyUrl}`);
    
    // 检查密钥格式
    if (alipayPrivateKey.includes('BEGIN PRIVATE KEY')) {
      console.log('✅ 私钥格式正确 (PEM)');
    } else {
      console.log('❌ 私钥格式可能不正确 (应包含 BEGIN PRIVATE KEY)');
    }
    
    if (alipayPublicKey.includes('BEGIN PUBLIC KEY')) {
      console.log('✅ 公钥格式正确 (PEM)');
    } else {
      console.log('❌ 公钥格式可能不正确 (应包含 BEGIN PUBLIC KEY)');
    }
  } else {
    console.log('❌ 支付宝配置不完整');
    if (!alipayAppId) console.log('   缺失: ALIPAY_APP_ID');
    if (!alipayPrivateKey) console.log('   缺失: ALIPAY_PRIVATE_KEY');
    if (!alipayPublicKey) console.log('   缺失: ALIPAY_PUBLIC_KEY');
    if (!alipayNotifyUrl) console.log('   缺失: ALIPAY_NOTIFY_URL');
  }
  
  // 检查微信支付配置
  console.log('\n' + '='.repeat(60));
  console.log('🔍 微信支付配置详情:');
  const wechatAppId = process.env.WECHAT_APP_ID;
  const wechatMchId = process.env.WECHAT_MCH_ID;
  const wechatPrivateKey = process.env.WECHAT_PRIVATE_KEY;
  const wechatSerialNo = process.env.WECHAT_SERIAL_NO;
  const wechatApiV3Key = process.env.WECHAT_APIV3_KEY;
  const wechatNotifyUrl = process.env.WECHAT_NOTIFY_URL;
  const wechatPlatformCert = process.env.WECHAT_PLATFORM_CERT;
  
  if (wechatAppId && wechatMchId && wechatPrivateKey && wechatSerialNo && wechatApiV3Key && wechatNotifyUrl) {
    console.log('✅ 微信支付核心配置完整');
    console.log(`   App ID: ${wechatAppId}`);
    console.log(`   Mch ID: ${wechatMchId}`);
    console.log(`   私钥长度: ${wechatPrivateKey.length} 字符`);
    console.log(`   证书序列号: ${wechatSerialNo}`);
    console.log(`   回调地址: ${wechatNotifyUrl}`);
    
    // 检查私钥格式
    if (wechatPrivateKey.includes('BEGIN PRIVATE KEY')) {
      console.log('✅ 私钥格式正确 (PEM)');
    } else {
      console.log('❌ 私钥格式可能不正确 (应包含 BEGIN PRIVATE KEY)');
    }
    
    // 检查平台证书
    if (wechatPlatformCert) {
      if (wechatPlatformCert.includes('BEGIN PUBLIC KEY') || wechatPlatformCert.includes('BEGIN CERTIFICATE')) {
        console.log('✅ 平台证书已配置 (PEM格式)');
        console.log(`   证书长度: ${wechatPlatformCert.length} 字符`);
      } else {
        console.log('❌ 平台证书格式不正确 (应包含 BEGIN PUBLIC KEY 或 BEGIN CERTIFICATE)');
      }
    } else {
      console.log('⚠️ 平台证书未配置 (可选但推荐)');
    }
  } else {
    console.log('❌ 微信支付核心配置不完整');
    if (!wechatAppId) console.log('   缺失: WECHAT_APP_ID');
    if (!wechatMchId) console.log('   缺失: WECHAT_MCH_ID');
    if (!wechatPrivateKey) console.log('   缺失: WECHAT_PRIVATE_KEY');
    if (!wechatSerialNo) console.log('   缺失: WECHAT_SERIAL_NO');
    if (!wechatApiV3Key) console.log('   缺失: WECHAT_APIV3_KEY');
    if (!wechatNotifyUrl) console.log('   缺失: WECHAT_NOTIFY_URL');
  }
  
  console.log('\n' + '='.repeat(60));
}

checkEnvVars();