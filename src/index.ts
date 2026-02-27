import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error';

// Import routes
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payment';
import subscriptionRoutes from './routes/subscription';
import railwayRoutes from './routes/railway';
import railwayDeploymentRoutes from './routes/railway-deployment';
import deploymentRoutes from './routes/deployment';
import deploymentMonitorRoutes from './routes/deployment-monitor';

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middleware
// ============================================================

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================================
// Static Files (Frontend)
// ============================================================
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuildPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api/') && !req.path.includes('.')) {
    const indexPath = path.join(frontendBuildPath, 'index.html');
    res.sendFile(indexPath);
  }
});

// ============================================================
// Health Check Route
// ============================================================

app.get('/health', (req: Request, res: Response) => {
  // Use req parameter if needed for future enhancements
  console.log(`Health check from ${req.ip}`);
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  // Use req parameter if needed for future enhancements
  console.log(`API health check from ${req.ip}`);
  
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route - redirect to frontend login page
app.get('/', (_req: Request, res: Response) => {
  // Use APP_URL or RAILWAY_PUBLIC_DOMAIN for production, fallback to localhost for development
  let appUrl = process.env.APP_URL;
  
  // If APP_URL is not set or is localhost, try RAILWAY_PUBLIC_DOMAIN
  if (!appUrl || appUrl.includes('localhost')) {
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      appUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    } else {
      appUrl = 'http://localhost:5173';
    }
  }
  
  // Redirect to login page instead of root to avoid redirect loops
  res.redirect(`${appUrl}/login`);
});

// ============================================================
// API Routes
// ============================================================

// Authentication routes
app.use('/api/auth', authRoutes);

// Payment routes
app.use('/api/payment', paymentRoutes);

// Subscription routes
app.use('/api/subscription', subscriptionRoutes);

// Railway routes
app.use('/api/railway', railwayRoutes);

// Railway deployment routes (new automated deployment)
app.use('/api/railway/deployment', railwayDeploymentRoutes);

// Deployment routes
app.use('/api/deployment', deploymentRoutes);

// Deployment monitor routes
app.use('/api/deployment-monitor', deploymentMonitorRoutes);

// ============================================================
// Error Handling
// ============================================================

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);

// ============================================================
// Start Server
// ============================================================

// Initialize deployment monitor
import { deploymentMonitor } from './services/deployment/deployment-monitor';

const server = app.listen(PORT, async () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🚀 OpenClaw Subscription Site Server                  ║
╠════════════════════════════════════════════════════════╣
║   Environment: ${env.padEnd(36)}║
║   Server: http://localhost:${PORT}                      ║
║   API: http://localhost:${PORT}/api                     ║
╚════════════════════════════════════════════════════════╝
  `);

  // Start deployment monitoring in production
  if (env === 'production') {
    try {
      await deploymentMonitor.startMonitoring();
      console.log('📊 Deployment monitor started');
    } catch (error) {
      console.error('❌ Failed to start deployment monitor:', error);
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Stop deployment monitor
  deploymentMonitor.stopMonitoring();
  console.log('📊 Deployment monitor stopped');
  
  server.close(async () => {
    console.log('HTTP server closed');
    // Close database connection if needed
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  // Stop deployment monitor
  deploymentMonitor.stopMonitoring();
  console.log('📊 Deployment monitor stopped');
  
  server.close(async () => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
