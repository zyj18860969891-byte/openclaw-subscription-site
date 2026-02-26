import { deploymentService } from '../../src/services/deployment/deployment-service';
import { railwayClient } from '../../src/services/deployment/railway-client';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
const prisma = new PrismaClient();

// Mock railway client
jest.mock('../../src/services/deployment/railway-client');
const mockRailwayClient = railwayClient as jest.Mocked<typeof railwayClient>;

// Mock generateEnvVariables
jest.mock('../../src/services/deployment/env-variable-generator');
const mockGenerateEnvVars = require('../../src/services/deployment/env-variable-generator').generateEnvVariables;

describe('DeploymentService', () => {
  let deploymentService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create deployment service instance
    deploymentService = new (require('../../src/services/deployment/deployment-service').DeploymentService)();
  });

  describe('deployNewInstance', () => {
    const mockSubscription = {
      id: 'sub_123',
      userId: 'user_123',
      planType: 'basic',
      channelCredentials: [
        {
          id: 'cred_1',
          channelType: 'feishu',
          channelName: 'Test Feishu',
          credentials: {
            appId: 'cli_test_123',
            appSecret: 'test_secret',
            webhookToken: 'test_webhook_token',
          },
          isActive: true,
        },
      ],
      payments: [
        {
          id: 'pay_123',
          status: 'success',
          amount: 4900,
          createdAt: new Date(),
        },
      ],
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
    };

    beforeEach(() => {
      // Mock database queries
      prisma.subscriptions.findUnique = jest.fn().mockResolvedValue(mockSubscription);
      
      // Mock railway client methods
      mockRailwayClient.cloneService.mockResolvedValue({
        id: 'service_123',
        name: 'openclaw-basic-user123-1234567890',
        projectId: 'project_123',
        status: 'running',
        publicDomain: 'https://test-openclaw.railway.app',
      });
      
      mockRailwayClient.setEnvironmentVariables.mockResolvedValue(undefined);
      mockRailwayClient.triggerDeployment.mockResolvedValue({
        id: 'deploy_123',
        status: 'success',
      });
      
      mockRailwayClient.monitorDeployment.mockResolvedValue({
        success: true,
        url: 'https://test-openclaw.railway.app',
      });
      
      // Mock database save
      prisma.railwayInstances.create = jest.fn().mockResolvedValue({
        id: 'instance_123',
        subscriptionId: 'sub_123',
        railwayServiceId: 'service_123',
      });
      
      // Mock generateEnvVariables
      mockGenerateEnvVars.mockResolvedValue({
        FEISHU_1_APP_ID: 'cli_test_123',
        FEISHU_1_APP_SECRET: 'test_secret',
        OPENCLAW_USER_ID: 'user_123',
        OPENCLAW_PLAN: 'BASIC',
      });
    });

    it('should successfully deploy a new instance', async () => {
      const result = await deploymentService.deployNewInstance('sub_123');

      expect(result.success).toBe(true);
      expect(result.serviceId).toBe('service_123');
      expect(result.serviceUrl).toBe('https://test-openclaw.railway.app');
      expect(result.deploymentTime).toBeDefined();

      // Verify railway client calls
      expect(mockRailwayClient.cloneService).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/openclaw-basic-user123-\d+/),
        undefined
      );
      
      expect(mockRailwayClient.setEnvironmentVariables).toHaveBeenCalledWith(
        'service_123',
        expect.objectContaining({
          FEISHU_1_APP_ID: 'cli_test_123',
          OPENCLAW_USER_ID: 'user_123',
        })
      );
      
      expect(mockRailwayClient.triggerDeployment).toHaveBeenCalledWith('service_123');
      expect(mockRailwayClient.monitorDeployment).toHaveBeenCalledWith(
        'service_123',
        300000
      );

      // Verify database save
      expect(prisma.railwayInstances.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subscriptionId: 'sub_123',
          railwayServiceId: 'service_123',
          instanceName: expect.stringMatching(/openclaw-basic-user123-\d+/),
          status: 'running',
          railwayUrl: 'https://test-openclaw.railway.app',
          publicDomain: 'https://test-openclaw.railway.app',
        }),
      });
    });

    it('should handle missing subscription', async () => {
      prisma.subscriptions.findUnique.mockResolvedValue(null);

      const result = await deploymentService.deployNewInstance('sub_999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription not found: sub_999');
    });

    it('should handle missing channel credentials', async () => {
      const subscriptionWithoutChannels = { ...mockSubscription, channelCredentials: [] };
      prisma.subscriptions.findUnique.mockResolvedValue(subscriptionWithoutChannels);

      const result = await deploymentService.deployNewInstance('sub_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No channel credentials found for subscription');
    });

    it('should handle missing payment', async () => {
      const subscriptionWithoutPayment = { ...mockSubscription, payments: [] };
      prisma.subscriptions.findUnique.mockResolvedValue(subscriptionWithoutPayment);

      const result = await deploymentService.deployNewInstance('sub_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No successful payment found for subscription');
    });

    it('should handle railway client errors', async () => {
      mockRailwayClient.cloneService.mockRejectedValue(new Error('Service clone failed'));

      const result = await deploymentService.deployNewInstance('sub_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service clone failed');
      
      // Verify subscription status is updated to failed
      expect(prisma.subscriptions.update).toHaveBeenCalledWith({
        where: { id: 'sub_123' },
        data: expect.objectContaining({
          status: 'failed',
        }),
      });
    });

    it('should handle deployment timeout', async () => {
      mockRailwayClient.monitorDeployment.mockResolvedValue({
        success: false,
        error: 'Deployment timeout',
      });

      const result = await deploymentService.deployNewInstance('sub_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deployment timeout');
    });
  });

  describe('getDeploymentStatus', () => {
    const mockInstance = {
      id: 'instance_123',
      subscriptionId: 'sub_123',
      railwayServiceId: 'service_123',
      status: 'running',
      railwayUrl: 'https://test-openclaw.railway.app',
    };

    beforeEach(() => {
      prisma.railwayInstances.findFirst = jest.fn().mockResolvedValue(mockInstance);
      mockRailwayClient.getService.mockResolvedValue({
        id: 'service_123',
        status: 'running',
        publicDomain: 'https://test-openclaw.railway.app',
      });
    });

    it('should return running status for active service', async () => {
      const result = await deploymentService.getDeploymentStatus('sub_123');

      expect(result.status).toBe('running');
      expect(result.serviceUrl).toBe('https://test-openclaw.railway.app');
    });

    it('should return failed status for failed service', async () => {
      mockRailwayClient.getService.mockResolvedValue({
        id: 'service_123',
        status: 'failed',
      });

      const result = await deploymentService.getDeploymentStatus('sub_123');

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Service failed to start');
    });

    it('should return pending status when no instance found', async () => {
      prisma.railwayInstances.findFirst.mockResolvedValue(null);

      const result = await deploymentService.getDeploymentStatus('sub_999');

      expect(result.status).toBe('pending');
    });
  });

  describe('retryDeployment', () => {
    const mockInstance = {
      id: 'instance_123',
      subscriptionId: 'sub_123',
      railwayServiceId: 'service_123',
      status: 'failed',
    };

    beforeEach(() => {
      prisma.railwayInstances.findFirst = jest.fn().mockResolvedValue(mockInstance);
      mockRailwayClient.deleteService.mockResolvedValue(undefined);
      prisma.railwayInstances.delete = jest.fn().mockResolvedValue(undefined);
    });

    it('should delete existing instance and retry', async () => {
      const result = await deploymentService.retryDeployment('sub_123');

      expect(mockRailwayClient.deleteService).toHaveBeenCalledWith('service_123');
      expect(prisma.railwayInstances.delete).toHaveBeenCalledWith({
        where: { id: 'instance_123' },
      });
      expect(result.success).toBe(true);
    });

    it('should handle missing instance', async () => {
      prisma.railwayInstances.findFirst.mockResolvedValue(null);

      const result = await deploymentService.retryDeployment('sub_999');

      expect(mockRailwayClient.deleteService).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('cancelDeployment', () => {
    const mockInstance = {
      id: 'instance_123',
      subscriptionId: 'sub_123',
      railwayServiceId: 'service_123',
    };

    beforeEach(() => {
      prisma.railwayInstances.findFirst = jest.fn().mockResolvedValue(mockInstance);
      mockRailwayClient.deleteService.mockResolvedValue(undefined);
      prisma.railwayInstances.delete = jest.fn().mockResolvedValue(undefined);
    });

    it('should cancel existing deployment', async () => {
      await deploymentService.cancelDeployment('sub_123');

      expect(mockRailwayClient.deleteService).toHaveBeenCalledWith('service_123');
      expect(prisma.railwayInstances.delete).toHaveBeenCalledWith({
        where: { id: 'instance_123' },
      });
    });

    it('should handle missing instance', async () => {
      prisma.railwayInstances.findFirst.mockResolvedValue(null);

      await expect(deploymentService.cancelDeployment('sub_999')).resolves.not.toThrow();
    });
  });

  describe('getDeploymentLogs', () => {
    const mockInstance = {
      id: 'instance_123',
      subscriptionId: 'sub_123',
      railwayServiceId: 'service_123',
    };

    beforeEach(() => {
      prisma.railwayInstances.findFirst = jest.fn().mockResolvedValue(mockInstance);
      mockRailwayClient.getServiceLogs.mockResolvedValue('Sample deployment logs...');
    });

    it('should get deployment logs', async () => {
      const logs = await deploymentService.getDeploymentLogs('sub_123');

      expect(logs).toBe('Sample deployment logs...');
      expect(mockRailwayClient.getServiceLogs).toHaveBeenCalledWith('service_123');
    });

    it('should throw error when no instance found', async () => {
      prisma.railwayInstances.findFirst.mockResolvedValue(null);

      await expect(deploymentService.getDeploymentLogs('sub_999')).rejects.toThrow(
        'No deployment instance found'
      );
    });
  });
});