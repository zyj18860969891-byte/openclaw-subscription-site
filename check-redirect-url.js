require('dotenv').config();

console.log('=== 检查重定向URL ===\n');

const appUrl = process.env.APP_URL;
const railwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

console.log('APP_URL:', appUrl || '未设置');
console.log('RAILWAY_PUBLIC_DOMAIN:', railwayPublicDomain || '未设置');

// 计算最终重定向URL
let finalRedirectUrl;
if (appUrl) {
  finalRedirectUrl = appUrl;
} else if (railwayPublicDomain) {
  finalRedirectUrl = `https://${railwayPublicDomain}`;
} else {
  finalRedirectUrl = 'http://localhost:5173';
}

console.log('最终重定向URL:', finalRedirectUrl);

// 检查是否正确
if (finalRedirectUrl.includes('localhost')) {
  console.log('\n❌ 重定向URL包含 localhost，这是错误的！');
  console.log('应该重定向到 Railway 域名');
} else if (finalRedirectUrl.includes('railway.app')) {
  console.log('\n✅ 重定向URL正确，指向 Railway 域名');
} else {
  console.log('\n⚠️  重定向URL未知');
}