const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// 测试结果统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(method, endpoint, body = null, description = '') {
  totalTests++;
  
  try {
    const url = `${API_BASE}${endpoint}`;
    const options = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.data = body;
    }
    
    const response = await axios(options);
    
    if (response.status >= 200 && response.status < 300) {
      passedTests++;
      log(`✅ ${method} ${endpoint} - ${description}`, 'green');
      log(`   响应: ${JSON.stringify(response.data).substring(0, 100)}...`, 'cyan');
    } else {
      failedTests++;
      log(`❌ ${method} ${endpoint} - ${description}`, 'red');
      log(`   状态码: ${response.status}`, 'red');
      log(`   响应: ${JSON.stringify(response.data).substring(0, 100)}...`, 'red');
    }
  } catch (error) {
    failedTests++;
    log(`❌ ${method} ${endpoint} - ${description}`, 'red');
    if (error.response) {
      log(`   状态码: ${error.response.status}`, 'red');
      log(`   响应: ${JSON.stringify(error.response.data).substring(0, 100)}...`, 'red');
    } else {
      log(`   错误: ${error.message}`, 'red');
    }
  }
}

async function runAllTests() {
  log('\n========================================', 'blue');
  log('  OpenClaw 订阅网站 API 测试', 'blue');
  log('========================================\n', 'blue');
  
  // Phase 1: 基础端点 (无需数据库)
  log('【Phase 1】基础端点', 'yellow');
  log('----------------------------------------', 'gray');
  
  await testEndpoint('GET', '/health', null, '健康检查');
  await testEndpoint('GET', '/api/health', null, 'API健康检查 (需要认证)');
  
  log('');
  
  // Phase 2: 订阅计划端点 (无需数据库)
  log('【Phase 2】订阅计划端点', 'yellow');
  log('----------------------------------------', 'gray');
  
  await testEndpoint('GET', '/subscription/plans', null, '获取所有计划');
  await testEndpoint('GET', '/subscription/plans/BASIC', null, '获取BASIC计划');
  
  log('');
  
  // Phase 3: 认证端点 (需要数据库)
  log('【Phase 3】认证端点 (需要数据库)', 'yellow');
  log('----------------------------------------', 'gray');
  
  await testEndpoint('POST', '/auth/register', {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  }, '用户注册');
  await testEndpoint('POST', '/auth/login', {
    email: 'test@example.com',
    password: 'password123'
  }, '用户登录');
  
  log('');
  
  // Phase 4: 需要认证的端点 (需要数据库)
  log('【Phase 4】需要认证的端点 (需要数据库)', 'yellow');
  log('----------------------------------------', 'gray');
  
  await testEndpoint('GET', '/auth/profile', null, '获取用户信息 (需要认证)');
  await testEndpoint('POST', '/auth/logout', {}, '用户登出');
  await testEndpoint('GET', '/subscription/current', null, '获取当前订阅 (需要认证)');
  await testEndpoint('POST', '/subscription/create', {
    plan: 'BASIC',
    autoRenew: true
  }, '创建订阅 (需要认证)');
  await testEndpoint('POST', '/subscription/cancel', {}, '取消订阅 (需要认证)');
  await testEndpoint('POST', '/subscription/renew', {}, '续费订阅 (需要认证)');
  await testEndpoint('GET', '/subscription/active', null, '检查订阅状态 (需要认证)');
  
  log('');
  
  // Phase 5: 支付端点 (需要数据库)
  log('【Phase 5】支付端点 (需要数据库)', 'yellow');
  log('----------------------------------------', 'gray');
  
  await testEndpoint('POST', '/payment/create', {
    method: 'alipay',
    amount: 4900,
    plan: 'BASIC',
    orderId: 'TEST_001'
  }, '创建支付订单');
  await testEndpoint('GET', '/payment/alipay/TEST_001', null, '查询支付宝订单状态');
  await testEndpoint('GET', '/payment/wechat/TEST_001', null, '查询微信订单状态');
  await testEndpoint('POST', '/payment/refund', {
    method: 'alipay',
    outTradeNo: 'TEST_001',
    amount: 4900,
    reason: '测试退款'
  }, '申请退款');
  
  log('');
  
  // Phase 6: Railway部署端点 (需要数据库)
  log('【Phase 6】Railway部署端点 (需要数据库)', 'yellow');
  log('----------------------------------------', 'gray');
  
  await testEndpoint('GET', '/railway/instances', null, '获取所有实例 (需要认证)');
  await testEndpoint('POST', '/railway/instances', {
    subscriptionId: 'test-sub-001',
    plan: 'BASIC',
    channelConfig: {
      feishu: {
        appId: 'test123'
      }
    }
  }, '创建新实例 (需要认证)');
  await testEndpoint('GET', '/railway/instances/TEST_INSTANCE_001', null, '获取实例详情 (需要认证)');
  await testEndpoint('PUT', '/railway/instances/TEST_INSTANCE_001', {
    status: 'STOPPED'
  }, '更新实例 (需要认证)');
  await testEndpoint('DELETE', '/railway/instances/TEST_INSTANCE_001', null, '删除实例 (需要认证)');
  await testEndpoint('POST', '/railway/instances/TEST_INSTANCE_001/deploy', {}, '触发部署 (需要认证)');
  await testEndpoint('GET', '/railway/instances/TEST_INSTANCE_001/status', null, '获取部署状态 (需要认证)');
  await testEndpoint('POST', '/railway/instances/TEST_INSTANCE_001/stop', {}, '停止实例 (需要认证)');
  
  log('');
  
  // 总结
  log('========================================', 'blue');
  log('  测试完成！', 'blue');
  log('========================================', 'blue');
  log(`总计: ${totalTests} 个测试`, 'cyan');
  log(`通过: ${passedTests} 个`, 'green');
  log(`失败: ${failedTests} 个`, 'red');
  log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'cyan');
  log('');
  
  // 分类总结
  log('【分类总结】', 'yellow');
  log('----------------------------------------', 'gray');
  log(`基础端点 (无需数据库): ${passedTests >= 2 ? '✅' : '❌'} 通过`, 'cyan');
  log(`订阅计划端点 (无需数据库): ${passedTests >= 4 ? '✅' : '❌'} 通过`, 'cyan');
  log(`认证端点 (需要数据库): ${passedTests >= 6 ? '✅' : '❌'} 通过`, 'cyan');
  log(`需要认证的端点 (需要数据库): ${passedTests >= 13 ? '✅' : '❌'} 通过`, 'cyan');
  log(`支付端点 (需要数据库): ${passedTests >= 17 ? '✅' : '❌'} 通过`, 'cyan');
  log(`Railway部署端点 (需要数据库): ${passedTests >= 24 ? '✅' : '❌'} 通过`, 'cyan');
  log('');
}

// 运行测试
runAllTests().catch(console.error);
