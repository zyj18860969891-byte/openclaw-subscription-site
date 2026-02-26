import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 * 用于与数据库的所有交互
 */

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // 在开发环境，防止hot reload创建过多连接
  const globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };

  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({
      log: ['error', 'warn'],
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
