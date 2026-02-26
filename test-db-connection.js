const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('DATABASE_PUBLIC_URL:', process.env.DATABASE_PUBLIC_URL);
    
    // Try to connect
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query executed successfully:', result);
    
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testConnection();