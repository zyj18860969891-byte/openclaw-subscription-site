import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 * 用于与数据库的所有交互
 */

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    // 连接池配置
    datasourceConnectOptions: {
      connectionTimeout: 30000, // 30秒连接超时
    },
    // 连接池大小
    connectionPoolSize: 20, // 增加连接池大小
  });
} else {
  // 在开发环境，防止hot reload创建过多连接
  const globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };

  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasourceConnectOptions: {
        connectionTimeout: 30000,
      },
      connectionPoolSize: 10,
    });
  }

  prisma = globalWithPrisma.prisma;
}

/**
 * 优雅关闭数据库连接
 */
export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
