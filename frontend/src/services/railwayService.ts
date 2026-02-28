import { apiClient } from './apiClient';

export interface RailwayInstance {
  id: string;
  userId: string;
  subscriptionId: string;
  projectId: string;
  projectName: string;
  serviceId: string;
  serviceName: string;
  environmentId: string;
  environmentName: string;
  deploymentId?: string;
  deploymentStatus: 'INITIALIZING' | 'BUILDING' | 'DEPLOYING' | 'RUNNING' | 'FAILED' | 'CRASHED';
  deploymentUpdatedAt: string;
  deploymentCompletedAt?: string;
  status: 'INITIALIZING' | 'DEPLOYING' | 'RUNNING' | 'FAILED' | 'DELETED';
  publicUrl?: string;
  variables: Record<string, string>;
  logs: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInstanceRequest {
  instanceName?: string;
  channelCredentials?: Record<string, any>;
  customVariables?: Array<{
    name: string;
    value: string;
    isSecret?: boolean;
  }>;
}

export interface InstanceStatus {
  instanceId: string;
  status: string;
  deploymentStatus: string;
  monitoring: {
    status: string;
    progress: number;
    logs: string[];
    estimatedTimeRemaining?: number;
  };
  health: {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
    uptime: number;
    lastCheckedAt: string;
  };
}

export const railwayService = {
  /**
   * 创建新的Railway实例
   */
  async createInstance(data?: CreateInstanceRequest): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await apiClient.post('/railway/instances', data);
    return response.data;
  },

  /**
   * 获取当前用户的所有实例
   */
  async getInstances(): Promise<RailwayInstance[]> {
    console.log('🔍 [RailwayService] 开始获取实例列表');
    const startTime = Date.now();
    
    try {
      const response = await apiClient.get('/railway/instances');
      const queryTime = Date.now() - startTime;
      console.log(`✅ [RailwayService] 实例列表获取成功，耗时: ${queryTime}ms，数量: ${response.data.data?.length || 0}`);
      return response.data.data;
    } catch (error: any) {
      const queryTime = Date.now() - startTime;
      console.error(`❌ [RailwayService] 实例列表获取失败，耗时: ${queryTime}ms`, error);
      throw error;
    }
  },

  /**
   * 获取指定实例详情
   */
  async getInstance(instanceId: string): Promise<RailwayInstance> {
    const response = await apiClient.get(`/railway/instances/${instanceId}`);
    return response.data.data;
  },

  /**
   * 获取实例状态（包括监控和健康信息）
   */
  async getInstanceStatus(instanceId: string): Promise<InstanceStatus> {
    const response = await apiClient.get(`/railway/instances/${instanceId}/status`);
    return response.data.data;
  },

  /**
   * 获取实例部署日志
   */
  async getInstanceLogs(instanceId: string, limit?: number): Promise<string[]> {
    const response = await apiClient.get(`/railway/instances/${instanceId}/logs${limit ? `?limit=${limit}` : ''}`);
    return response.data.data;
  },

  /**
   * 更新实例配置
   */
  async updateInstance(
    instanceId: string,
    data: Partial<CreateInstanceRequest>
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await apiClient.put(`/railway/instances/${instanceId}`, data);
    return response.data;
  },

  /**
   * 重新部署实例
   */
  async redeployInstance(instanceId: string): Promise<{ success: boolean; message: string; data?: { deploymentId: string } }> {
    const response = await apiClient.post(`/railway/instances/${instanceId}/redeploy`);
    return response.data;
  },

  /**
   * 删除实例
   */
  async deleteInstance(instanceId: string): Promise<void> {
    await apiClient.delete(`/railway/instances/${instanceId}`);
  },

  /**
   * 配置实例通道
   */
  async configureChannel(
    instanceId: string,
    channelType: string,
    credentials: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/railway/instances/${instanceId}/channels`, {
      channelType,
      credentials,
    });
    return response.data;
  },

  /**
   * 获取实例健康状态
   */
  async getInstanceHealth(instanceId: string): Promise<any> {
    const response = await apiClient.get(`/railway/instances/${instanceId}/health`);
    return response.data.data;
  },
};