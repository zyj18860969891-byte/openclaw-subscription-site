/**
 * Railway服务测试
 * 测试克隆服务、环境变量管理和部署监控
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RailwayClient } from '../src/services/railway/railway-client';
import { RailwayCloneService } from '../src/services/railway/railway-clone-service';
import { EnvironmentVariableService } from '../src/services/railway/environment-variable-service';
import { DeploymentMonitoringService } from '../src/services/railway/deployment-monitoring-service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  railwayInstance: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  channelCredential: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
  },
} as any;

// Mock Railway Client
const mockRailwayClient = {
  getProject: vi.fn(),
  createProject: vi.fn(),
  getProjectServices: vi.fn(),
  getService: vi.fn(),
  getProjectEnvironments: vi.fn(),
  createEnvironment: vi.fn(),
  setServiceVariables: vi.fn(),
  getServiceVariables: vi.fn(),
  getLatestDeployment: vi.fn(),
  triggerRedeploy: vi.fn(),
  getDeploymentStatus: vi.fn(),
  deleteProject: vi.fn(),
  deleteService: vi.fn(),
} as any;

describe('RailwayCloneService', () => {
  let cloneService: RailwayCloneService;

  beforeEach(() => {
    vi.clearAllMocks();
    cloneService = new RailwayCloneService(mockRailwayClient, mockPrisma);
  });

  it('应该成功克隆项目并创建实例', async () => {
    const timestamp = Date.now();

    mockRailwayClient.getProject.mockResolvedValue({
      id: 'template-project-id',
      name: 'Template Project',
      description: 'Template',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    mockRailwayClient.createProject.mockResolvedValue({
      id: `new-project-${timestamp}`,
      name: `moltbot-basic-${timestamp}`,
      description: 'Test instance',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    mockRailwayClient.createEnvironment.mockResolvedValue({
      id: 'env-id',
      name: 'production',
      projectId: `new-project-${timestamp}`,
      createdAt: new Date().toISOString(),
    });

    mockRailwayClient.getService.mockResolvedValue({
      id: 'template-service-id',
      name: 'Template Service',
      projectId: 'template-project-id',
      createdAt: new Date().toISOString(),
      source: { repo: 'user/repo', branch: 'main' },
    });

    mockRailwayClient.getServiceVariables.mockResolvedValue({
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
    });

    mockRailwayClient.setServiceVariables.mockResolvedValue(undefined);

    mockRailwayClient.triggerRedeploy.mockResolvedValue({
      id: 'deploy-id',
      status: 'INITIALIZING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    mockPrisma.railwayInstance.create.mockResolvedValue({
      id: 'instance-id',
      projectId: `new-project-${timestamp}`,
      status: 'INITIALIZING',
    });

    const result = await cloneService.cloneAndCreateInstance({
      templateProjectId: 'template-project-id',
      templateServiceId: 'template-service-id',
      userId: 'user-123',
      subscriptionId: 'sub-123',
      plan: 'BASIC',
      instanceName: 'moltbot',
    });

    expect(result.success).toBe(true);
    expect(result.projectId).toBeDefined();
    expect(result.serviceId).toBeDefined();
    expect(result.environmentId).toBeDefined();
  });

  it('应该正确处理克隆失败', async () => {
    mockRailwayClient.getProject.mockRejectedValue(new Error('API Error'));

    const result = await cloneService.cloneAndCreateInstance({
      templateProjectId: 'template-project-id',
      templateServiceId: 'template-service-id',
      userId: 'user-123',
      subscriptionId: 'sub-123',
      plan: 'BASIC',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to clone instance');
  });

  it('应该正确监控部署进度', async () => {
    const deploymentId = 'deploy-123';

    mockRailwayClient.getDeploymentStatus
      .mockResolvedValueOnce({
        id: deploymentId,
        status: 'INITIALIZING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: deploymentId,
        status: 'BUILDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: deploymentId,
        status: 'RUNNING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    const result = await cloneService.monitorDeployment(deploymentId, 3);

    expect(result).toBe(true);
  });

  it('应该正确删除实例', async () => {
    mockRailwayClient.deleteService.mockResolvedValue(undefined);
    mockRailwayClient.deleteProject.mockResolvedValue(undefined);
    mockPrisma.railwayInstance.updateMany.mockResolvedValue({ count: 1 });

    await cloneService.deleteInstance('project-id', 'service-id');

    expect(mockRailwayClient.deleteService).toHaveBeenCalledWith('service-id');
    expect(mockRailwayClient.deleteProject).toHaveBeenCalledWith('project-id');
    expect(mockPrisma.railwayInstance.updateMany).toHaveBeenCalled();
  });
});

describe('EnvironmentVariableService', () => {
  let envVarService: EnvironmentVariableService;

  beforeEach(() => {
    vi.clearAllMocks();
    envVarService = new EnvironmentVariableService(mockPrisma, 'test-secret-key-32-chars-long!!!');
  });

  it('应该加密和解密凭证', () => {
    const credentials = {
      appId: 'test-app-id',
      secret: 'test-secret',
    };

    const encrypted = envVarService.encryptCredentials(credentials);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.encryptedData).toBeDefined();
    expect(encrypted.algorithm).toBe('aes-256-cbc');

    const decrypted = envVarService.decryptCredentials(encrypted);
    expect(decrypted.appId).toBe('test-app-id');
    expect(decrypted.secret).toBe('test-secret');
  });

  it('应该验证飞书凭证', async () => {
    const validCredentials = {
      appId: 'test-app-id',
      secret: 'test-secret',
    };

    const result = await envVarService.validateChannelCredentials('feishu', validCredentials);
    expect(result.valid).toBe(true);

    const invalidCredentials = { appId: 'test-app-id' };
    const result2 = await envVarService.validateChannelCredentials('feishu', invalidCredentials);
    expect(result2.valid).toBe(false);
    expect(result2.error).toContain('Missing required field');
  });

  it('应该生成实例环境变量', async () => {
    mockPrisma.channelCredential.findMany.mockResolvedValue([]);

    const env = await envVarService.generateInstanceEnvironment(
      'sub-123',
      'PRO',
      'user-123',
      'moltbot-pro-instance'
    );

    expect(env.NODE_ENV).toBe('production');
    expect(env.OPENCLAW_USER_ID).toBe('user-123');
    expect(env.OPENCLAW_SUBSCRIPTION_ID).toBe('sub-123');
    expect(env.OPENCLAW_PLAN).toBe('PRO');
    expect(env.PLAN_MAX_INSTANCES).toBe('5');
    expect(env.PLAN_MAX_CHANNELS).toBe('10');
  });

  it('应该保存通道凭证', async () => {
    mockPrisma.channelCredential.upsert.mockResolvedValue({
      id: 'cred-id',
      subscriptionId: 'sub-123',
      channelType: 'feishu',
    });

    await envVarService.saveChannelCredentials('sub-123', 'feishu', {
      appId: 'test-id',
      secret: 'test-secret',
    });

    expect(mockPrisma.channelCredential.upsert).toHaveBeenCalled();
  });
});

describe('DeploymentMonitoringService', () => {
  let monitoringService: DeploymentMonitoringService;

  beforeEach(() => {
    vi.clearAllMocks();
    monitoringService = new DeploymentMonitoringService(mockPrisma, mockRailwayClient);
  });

  it('应该计算部署进度', async () => {
    mockPrisma.railwayInstance.findUnique.mockResolvedValue({
      id: 'instance-id',
      deploymentStatus: 'BUILDING',
      deploymentUpdatedAt: new Date(),
      deploymentCompletedAt: null,
      logs: [],
    });

    const monitoring = await monitoringService.getMonitoringData('instance-id');

    expect(monitoring).toBeDefined();
    expect(monitoring?.progress).toBe(30); // BUILDING进度为30%
    expect(monitoring?.estimatedTimeRemaining).toBe(180); // 估计3分钟
  });

  it('应该获取实例健康状态', async () => {
    const now = new Date();
    mockPrisma.railwayInstance.findUnique.mockResolvedValue({
      id: 'instance-id',
      status: 'RUNNING',
      deploymentCompletedAt: new Date(now.getTime() - 3600000), // 1小时前
    });

    const health = await monitoringService.getInstanceHealth('instance-id');

    expect(health).toBeDefined();
    expect(health?.status).toBe('HEALTHY');
    expect(health?.uptime).toBeGreaterThan(0);
  });

  it('应该获取部署日志', async () => {
    const logs = ['[2024-01-01] Deployed', '[2024-01-02] Updated'];
    mockPrisma.railwayInstance.findUnique.mockResolvedValue({
      id: 'instance-id',
      logs,
    });

    const retrievedLogs = await monitoringService.getDeploymentLogs('instance-id', 10);

    expect(retrievedLogs).toEqual(logs);
  });

  it('应该记录部署日志', async () => {
    mockPrisma.railwayInstance.findUnique.mockResolvedValue({
      id: 'instance-id',
      logs: [],
    });

    mockPrisma.railwayInstance.update.mockResolvedValue({
      id: 'instance-id',
      logs: ['[2024-01-01T00:00:00.000Z] Test log entry'],
    });

    await monitoringService.addDeploymentLog('instance-id', 'Test log entry');

    expect(mockPrisma.railwayInstance.update).toHaveBeenCalled();
  });

  it('应该获取所有监控的实例', async () => {
    const instances = monitoringService.getMonitoredInstances();
    expect(Array.isArray(instances)).toBe(true);
  });
});

describe('RailwayClient', () => {
  it('应该在没有API token时抛出错误', () => {
    expect(() => new RailwayClient('')).toThrow('Railway API token is required');
  });

  it('应该成功初始化', () => {
    const client = new RailwayClient('test-token-123');
    expect(client).toBeDefined();
  });
});
