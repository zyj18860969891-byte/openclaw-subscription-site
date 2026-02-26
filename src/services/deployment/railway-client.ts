import axios from 'axios';

// Railway API 配置
const RAILWAY_API_URL = 'https://api.railway.app';
const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;

// Railway API 响应类型
interface RailwayProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface RailwayService {
  id: string;
  name: string;
  projectId: string;
  status: 'creating' | 'running' | 'stopped' | 'failed';
  publicDomain?: string;
  deploymentId?: string;
}

interface RailwayDeployment {
  id: string;
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed';
  createdAt: string;
  updatedAt: string;
  error?: string;
}

interface RailwayEnvironmentVariable {
  key: string;
  value: string;
}

/**
 * Railway API 客户端
 * 用于管理 Railway 项目的创建、配置和部署
 */
export class RailwayClient {
  private api: import('axios').AxiosInstance;

  constructor() {
    if (!RAILWAY_API_TOKEN) {
      throw new Error('RAILWAY_API_TOKEN environment variable is required');
    }

    this.api = axios.create({
      baseURL: RAILWAY_API_URL,
      headers: {
        'Authorization': `Bearer ${RAILWAY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30秒超时
    });
  }

  /**
   * 创建新项目
   * @param projectName 项目名称
   * @returns 创建的项目信息
   */
  async createProject(projectName: string): Promise<RailwayProject> {
    try {
      const response = await this.api.post('/projects', {
        name: projectName,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create Railway project:', error);
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 克隆现有服务
   * @param sourceServiceId 源服务ID
   * @param newServiceName 新服务名称
   * @param projectId 项目ID（可选）
   * @returns 克隆的服务信息
   */
  async cloneService(
    sourceServiceId: string,
    newServiceName: string,
    projectId?: string
  ): Promise<RailwayService> {
    try {
      const response = await this.api.post('/services', {
        name: newServiceName,
        sourceService: sourceServiceId,
        projectId,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to clone Railway service:', error);
      throw new Error(`Failed to clone service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取服务信息
   * @param serviceId 服务ID
   * @returns 服务信息
   */
  async getService(serviceId: string): Promise<RailwayService> {
    try {
      const response = await this.api.get(`/services/${serviceId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get Railway service:', error);
      throw new Error(`Failed to get service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 设置环境变量
   * @param serviceId 服务ID
   * @param variables 环境变量键值对
   */
  async setEnvironmentVariables(
    serviceId: string,
    variables: Record<string, string>
  ): Promise<void> {
    try {
      // 批量设置环境变量
      const promises = Object.entries(variables).map(([key, value]) =>
        this.api.post(`/services/${serviceId}/variables`, {
          key,
          value,
        })
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to set environment variables:', error);
      throw new Error(`Failed to set environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取环境变量
   * @param serviceId 服务ID
   * @returns 环境变量列表
   */
  async getEnvironmentVariables(serviceId: string): Promise<RailwayEnvironmentVariable[]> {
    try {
      const response = await this.api.get(`/services/${serviceId}/variables`);
      return response.data;
    } catch (error) {
      console.error('Failed to get environment variables:', error);
      throw new Error(`Failed to get environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 触发部署
   * @param serviceId 服务ID
   * @returns 部署信息
   */
  async triggerDeployment(serviceId: string): Promise<RailwayDeployment> {
    try {
      const response = await this.api.post(`/services/${serviceId}/deploy`);
      return response.data;
    } catch (error) {
      console.error('Failed to trigger deployment:', error);
      throw new Error(`Failed to trigger deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取部署状态
   * @param serviceId 服务ID
   * @param deploymentId 部署ID（可选，不提供则获取最新部署）
   * @returns 部署状态
   */
  async getDeploymentStatus(
    serviceId: string,
    deploymentId?: string
  ): Promise<RailwayDeployment> {
    try {
      const url = deploymentId 
        ? `/services/${serviceId}/deployments/${deploymentId}`
        : `/services/${serviceId}/deployments/latest`;
      
      const response = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to get deployment status:', error);
      throw new Error(`Failed to get deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 监控部署直到完成
   * @param serviceId 服务ID
   * @param timeoutMs 超时时间（毫秒），默认5分钟
   * @returns 部署结果
   */
  async monitorDeployment(
    serviceId: string,
    timeoutMs: number = 300000
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const deployment = await this.getDeploymentStatus(serviceId);
        
        switch (deployment.status) {
          case 'success':
            // 获取服务信息以获取public domain
            const service = await this.getService(serviceId);
            return {
              success: true,
              url: service.publicDomain,
            };
            
          case 'failed':
            return {
              success: false,
              error: deployment.error || 'Deployment failed',
            };
            
          case 'pending':
          case 'building':
          case 'deploying':
            // 继续等待
            break;
        }
        
        // 等待3秒后重新检查
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error('Error monitoring deployment:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    
    return {
      success: false,
      error: 'Deployment timeout',
    };
  }

  /**
   * 删除服务
   * @param serviceId 服务ID
   */
  async deleteService(serviceId: string): Promise<void> {
    try {
      await this.api.delete(`/services/${serviceId}`);
    } catch (error) {
      console.error('Failed to delete Railway service:', error);
      throw new Error(`Failed to delete service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取项目下的所有服务
   * @param projectId 项目ID
   * @returns 服务列表
   */
  async getProjectServices(projectId: string): Promise<RailwayService[]> {
    try {
      const response = await this.api.get(`/projects/${projectId}/services`);
      return response.data;
    } catch (error) {
      console.error('Failed to get project services:', error);
      throw new Error(`Failed to get project services: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取服务日志
   * @param serviceId 服务ID
   * @param deploymentId 部署ID（可选）
   * @returns 日志内容
   */
  async getServiceLogs(serviceId: string, deploymentId?: string): Promise<string> {
    try {
      const url = deploymentId 
        ? `/services/${serviceId}/deployments/${deploymentId}/logs`
        : `/services/${serviceId}/logs`;
      
      const response = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to get service logs:', error);
      throw new Error(`Failed to get service logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 导出单例实例
export const railwayClient = new RailwayClient();