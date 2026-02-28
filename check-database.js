const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 检查数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    console.log('🔍 检查数据库表...');
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log('📋 数据库表列表:', tables);

    console.log('🔍 检查用户表...');
    const users = await prisma.user.findMany();
    console.log(`📊 用户表中有 ${users.length} 个用户:`, users);

    if (users.length === 0) {
      console.log('⚠️ 用户表为空，尝试创建测试用户...');
      try {
        const testUser = await prisma.user.create({
          data: {
            email: 'test@example.com',
            passwordHash: 'hashed_password',
            fullName: 'Test User',
          },
        });
        console.log('✅ 测试用户创建成功:', testUser);
      } catch (error) {
        console.log('❌ 测试用户创建失败:', error);
      }
    }

  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();