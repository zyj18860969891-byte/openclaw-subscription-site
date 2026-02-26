/**
 * Railway API客户端
 * 提供Railway.app API的完整封装
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface RailwayProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RailwayService {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  source: {
    repo?: string;
    branch?: string;
    provider?: string;
  };
}

export interface RailwayEnvironment {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
}

export interface RailwayDeployment {
  id: string;
  serviceId: string;
  environmentId: string;
  status: 'INITIALIZING' | 'BUILDING' | 'DEPLOYING' | 'CRASHED' | 'RUNNING' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface ServiceVariable {
  name: string;
  value: string;
  isSecret?: boolean;
}

export interface CloneProjectRequest {
  templateProjectId: string;
  templateServiceId: string;
  newProjectName: string;
  newServiceName: string;
  environmentVariables?: ServiceVariable[];
}

export interface CloneProjectResponse {
  projectId: string;
  projectName: string;
  serviceId: string;
  serviceName: string;
  environmentId: string;
  deploymentId?: string;
  status: string;
}

export interface ProjectStatus {
  projectId: string;
  projectName: string;
  services: ServiceStatus[];
  deployments: DeploymentStatus[];
}

export interface ServiceStatus {
  serviceId: string;
  serviceName: string;
  status: string;
  lastDeployment?: DeploymentStatus;
}

export interface DeploymentStatus {
  deploymentId: string;
  status: 'INITIALIZING' | 'BUILDING' | 'DEPLOYING' | 'CRASHED' | 'RUNNING' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface RailwayError {
  message: string;
  code?: string;
  statusCode: number;
}

export class RailwayClient {
  private client: AxiosInstance;
  private baseUrl: string = 'https://api.railway.app/graphql';

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error('Railway API token is required');
    }
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      timeout: 30000,
    });
  }

  /**
   * 执行GraphQL查询
   */
  private async executeQuery<T>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.post('', {
        query,
        variables,
      });

      if (response.data.errors) {
        const errorMessage = response.data.errors[0]?.message || 'Unknown GraphQL error';
        throw this.createError(errorMessage, response.status);
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.handleAxiosError(error);
      }
      throw error;
    }
  }

  /**
   * 获取项目信息
   */
  async getProject(projectId: string): Promise<RailwayProject> {
    const query = `
      query GetProject($id: String!) {
        project(id: $id) {
          id
          name
          description
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.executeQuery<{ project: RailwayProject }>(query, { id: projectId });
    return data.project;
  }

  /**
   * 创建新项目
   */
  async createProject(name: string, description?: string): Promise<RailwayProject> {
    const query = `
      mutation CreateProject($input: CreateProjectInput!) {
        createProject(input: $input) {
          id
          name
          description
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.executeQuery<{ createProject: RailwayProject }>(query, {
      input: {
        name,
        description,
      },
    });

    return data.createProject;
  }

  /**
   * 获取项目的所有服务
   */
  async getProjectServices(projectId: string): Promise<RailwayService[]> {
    const query = `
      query GetProjectServices($projectId: String!) {
        project(id: $projectId) {
          services {
            edges {
              node {
                id
                name
                projectId
                createdAt
                source {
                  repo
                  branch
                  provider
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.executeQuery<any>(query, { projectId });
    return data.project.services.edges.map((edge: any) => edge.node);
  }

  /**
   * 获取服务信息
   */
  async getService(serviceId: string): Promise<RailwayService> {
    const query = `
      query GetService($id: String!) {
        service(id: $id) {
          id
          name
          projectId
          createdAt
          source {
            repo
            branch
            provider
          }
        }
      }
    `;

    const data = await this.executeQuery<{ service: RailwayService }>(query, { id: serviceId });
    return data.service;
  }

  /**
   * 获取项目的环境列表
   */
  async getProjectEnvironments(projectId: string): Promise<RailwayEnvironment[]> {
    const query = `
      query GetProjectEnvironments($projectId: String!) {
        project(id: $projectId) {
          environments {
            edges {
              node {
                id
                name
                projectId
                createdAt
              }
            }
          }
        }
      }
    `;

    const data = await this.executeQuery<any>(query, { projectId });
    return data.project.environments.edges.map((edge: any) => edge.node);
  }

  /**
   * 创建环境
   */
  async createEnvironment(projectId: string, name: string): Promise<RailwayEnvironment> {
    const query = `
      mutation CreateEnvironment($input: CreateEnvironmentInput!) {
        createEnvironment(input: $input) {
          id
          name
          projectId
          createdAt
        }
      }
    `;

    const data = await this.executeQuery<{ createEnvironment: RailwayEnvironment }>(query, {
      input: {
        projectId,
        name,
      },
    });

    return data.createEnvironment;
  }

  /**
   * 在服务中设置环境变量
   */
  async setServiceVariables(
    serviceId: string,
    environmentId: string,
    variables: ServiceVariable[]
  ): Promise<void> {
    const variablesInput = variables.reduce(
      (acc, variable) => ({
        ...acc,
        [variable.name]: variable.value,
      }),
      {}
    );

    const query = `
      mutation UpdateServiceVariables($input: UpdateServiceVariablesInput!) {
        updateServiceVariables(input: $input) {
          id
        }
      }
    `;

    await this.executeQuery<any>(query, {
      input: {
        serviceId,
        environmentId,
        variables: variablesInput,
      },
    });
  }

  /**
   * 获取服务的环境变量
   */
  async getServiceVariables(serviceId: string, environmentId: string): Promise<Record<string, string>> {
    const query = `
      query GetServiceVariables($serviceId: String!, $environmentId: String!) {
        service(id: $serviceId) {
          variables(environmentId: $environmentId) {
            edges {
              node {
                name
                value
              }
            }
          }
        }
      }
    `;

    const data = await this.executeQuery<any>(query, { serviceId, environmentId });
    return data.service.variables.edges.reduce(
      (acc: Record<string, string>, edge: any) => ({
        ...acc,
        [edge.node.name]: edge.node.value,
      }),
      {}
    );
  }

  /**
   * 获取最新的部署
   */
  async getLatestDeployment(serviceId: string, environmentId: string): Promise<RailwayDeployment | null> {
    const query = `
      query GetLatestDeployment($serviceId: String!, $environmentId: String!) {
        deployments(
          first: 1
          serviceId: $serviceId
          environmentId: $environmentId
        ) {
          edges {
            node {
              id
              status
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const data = await this.executeQuery<any>(query, { serviceId, environmentId });
    const deployment = data.deployments.edges[0]?.node;
    return deployment || null;
  }

  /**
   * 触发重新部署
   */
  async triggerRedeploy(serviceId: string, environmentId: string): Promise<RailwayDeployment> {
    const query = `
      mutation TriggerRedeploy($input: CreateDeploymentInput!) {
        createDeployment(input: $input) {
          id
          status
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.executeQuery<{ createDeployment: RailwayDeployment }>(query, {
      input: {
        serviceId,
        environmentId,
      },
    });

    return data.createDeployment;
  }

  /**
   * 获取部署状态
   */
  async getDeploymentStatus(deploymentId: string): Promise<RailwayDeployment> {
    const query = `
      query GetDeploymentStatus($id: String!) {
        deployment(id: $id) {
          id
          status
          serviceId
          environmentId
          createdAt
          updatedAt
        }
      }
    `;

    const data = await this.executeQuery<{ deployment: RailwayDeployment }>(query, { id: deploymentId });
    return data.deployment;
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    const query = `
      mutation DeleteProject($id: String!) {
        deleteProject(id: $id)
      }
    `;

    await this.executeQuery<any>(query, { id: projectId });
  }

  /**
   * 删除服务
   */
  async deleteService(serviceId: string): Promise<void> {
    const query = `
      mutation DeleteService($id: String!) {
        deleteService(id: $id)
      }
    `;

    await this.executeQuery<any>(query, { id: serviceId });
  }

  /**
   * 错误处理
   */
  private handleAxiosError(error: AxiosError): RailwayError {
    const statusCode = error.response?.status || 500;
    let message = error.message;

    if (error.response?.data) {
      const data = error.response.data as any;
      message = data.message || data.errors?.[0]?.message || message;
    }

    return {
      message,
      statusCode,
    };
  }

  /**
   * 创建错误对象
   */
  private createError(message: string, statusCode: number): RailwayError {
    return {
      message,
      statusCode,
    };
  }
}
