/**
 * 测试部署流程
 * 模拟支付成功后的自动部署流程
 */

const { PrismaClient } = require('@prisma/client');
const { RailwayClient } = require('./src/services/railway/railway-client');
const { RailwayCloneService } = require('./src/services/railway/railway-clone-service');
const { PaymentGateway } = require('./src/services/payment/payment-gateway');

const prisma = new PrismaClient();

async function testDeploymentFlow() {
  console.log('🧪 开始测试部署流程...\n');

  try {
    // Step 1: 检查环境变量
    console.log('📋 Step 1: 检查环境变量');
    const requiredEnvVars = [
      'RAILWAY_API_TOKEN',
      'RAILWAY_TEMPLATE_PROJECT_ID',
      'RAILWAY_TEMPLATE_SERVICE_ID',
      'DATABASE_URL',
      'JWT_SECRET',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`缺少环境变量: ${envVar}`);
      }
      console.log(`  ✅ ${envVar}: ${process.env[envVar].substring(0, 20)}...`);
    }

    // Step 2: 测试数据库连接
    console.log('\n💾 Step 2: 测试数据库连接');
    await prisma.$connect();
    console.log('  ✅ 数据库连接成功');

    // Step 3: 创建测试用户
    console.log('\n👤 Step 3: 创建测试用户');
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        id: `user_${Date.now()}`,
        email: 'test@example.com',
        passwordHash: '$2a$10$YourHashedPasswordHere', // 需要bcrypt加密
        fullName: 'Test User',
      },
    });
    console.log(`  ✅ 测试用户创建成功: ${testUser.id}`);

    // Step 4: 创建测试订阅
    console.log('\n📦 Step 4: 创建测试订阅');
    const testSubscription = await prisma.subscription.create({
      data: {
        id: `sub_${Date.now()}`,
        userId: testUser.id,
        planType: 'PRO',
        priceAmount: 14900, // 149元，以分为单位
        currency: 'CNY',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
        isAutoRenew: true,
      },
    });
    console.log(`  ✅ 测试订阅创建成功: ${testSubscription.id}`);

    // Step 5: 创建测试支付记录
    console.log('\n💳 Step 5: 创建测试支付记录');
    const testPayment = await prisma.payment.create({
      data: {
        id: `pay_${Date.now()}`,
        orderId: `ALIPAY_${Date.now()}_test`,
        userId: testUser.id,
        subscriptionId: testSubscription.id,
        paymentMethod: 'ALIPAY',
        amount: 14900,
        currency: 'CNY',
        status: 'SUCCESS',
        paymentTime: new Date(),
        notifyTime: new Date(),
      },
    });
    console.log(`  ✅ 测试支付记录创建成功: ${testPayment.orderId}`);

    // Step 6: 创建测试通道凭证
    console.log('\n🔑 Step 6: 创建测试通道凭证');
    const testCredential = await prisma.channelCredential.create({
      data: {
        id: `cred_${Date.now()}`,
        subscriptionId: testSubscription.id,
        channelType: 'feishu',
        channelName: 'Test Feishu',
        credentialsEncrypted: {
          appId: 'cli_test123',
          appSecret: 'secret_test123',
          webhookToken: 'token_test123',
        },
        isActive: true,
      },
    });
    console.log(`  ✅ 测试通道凭证创建成功: ${testCredential.id}`);

    // Step 7: 初始化Railway服务
    console.log('\n🚆 Step 7: 初始化Railway服务');
    const railwayClient = new RailwayClient(process.env.RAILWAY_API_TOKEN);
    const railwayCloneService = new RailwayCloneService(railwayClient, prisma);
    console.log('  ✅ Railway服务初始化成功');

    // Step 8: 测试克隆部署
    console.log('\n🚀 Step 8: 测试克隆部署流程');
    console.log('  注意: 这将实际创建一个Railway实例，可能需要几分钟...\n');

    const cloneResult = await railwayCloneService.cloneAndCreateInstance({
      templateProjectId: process.env.RAILWAY_TEMPLATE_PROJECT_ID,
      templateServiceId: process.env.RAILWAY_TEMPLATE_SERVICE_ID,
      userId: testUser.id,
      subscriptionId: testSubscription.id,
      plan: 'PRO',
      channelCredentials: {
        feishu: testCredential.credentialsEncrypted,
      },
    });

    if (cloneResult.success) {
      console.log('  ✅ 克隆部署成功!');
      console.log(`  📋 项目ID: ${cloneResult.projectId}`);
      console.log(`  📋 项目名称: ${cloneResult.projectName}`);
      console.log(`  📋 服务ID: ${cloneResult.serviceId}`);
      console.log(`  📋 服务名称: ${cloneResult.serviceName}`);
      console.log(`  📋 环境ID: ${cloneResult.environmentId}`);
      console.log(`  📋 部署ID: ${cloneResult.deploymentId}`);
      console.log(`  🌐 公开URL: ${cloneResult.publicUrl || '待部署完成'}`);

      // Step 9: 监控部署状态
      console.log('\n👀 Step 9: 监控部署状态');
      console.log('  等待部署完成... (最多5分钟)');

      const maxAttempts = 30; // 30次检查，每次10秒，共5分钟
      for (let i = 0; i < maxAttempts; i++) {
        const deploymentStatus = await railwayClient.getDeploymentStatus(cloneResult.deploymentId!);
        console.log(`  [${i + 1}/${maxAttempts}] 状态: ${deploymentStatus.status}`);

        if (deploymentStatus.status === 'RUNNING') {
          console.log('  ✅ 部署完成！');
          break;
        }

        if (deploymentStatus.status === 'FAILED' || deploymentStatus.status === 'CRASHED') {
          console.log('  ❌ 部署失败！');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
      }

      // Step 10: 验证数据库记录
      console.log('\n📊 Step 10: 验证数据库记录');
      const railwayInstance = await prisma.railwayInstance.findFirst({
        where: { projectId: cloneResult.projectId },
      });

      if (railwayInstance) {
        console.log('  ✅ Railway实例记录已保存到数据库');
        console.log(`  📋 实例ID: ${railwayInstance.id}`);
        console.log(`  📋 状态: ${railwayInstance.status}`);
        console.log(`  📋 部署状态: ${railwayInstance.deploymentStatus}`);
      } else {
        console.log('  ❌ 未找到Raily实例记录');
      }

      // 清理测试数据（可选）
      console.log('\n🧹 清理测试数据? (y/n)');
      // 这里可以添加自动清理逻辑
    } else {
      console.log('  ❌ 克隆部署失败!');
      console.log(`  📋 错误: ${cloneResult.errorDetails}`);
    }

    console.log('\n✅ 测试完成！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
if (require.main === module) {
  testDeploymentFlow().catch(console.error);
}

module.exports = { testDeploymentFlow };