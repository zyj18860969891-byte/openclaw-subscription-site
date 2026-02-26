/**
 * 环境变量管理服务
 * 处理通道凭证加密、存储和自动注入
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

export interface EncryptedCredentials {
  iv: string;
  encryptedData: string;
  algorithm: string;
}

export interface DecryptedCredentials {
  [key: string]: string | number | boolean;
}

export class EnvironmentVariableService {
  private prisma: PrismaClient;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-cbc';

  constructor(prisma: PrismaClient, encryptionKey: string) {
    this.prisma = prisma;
    // 确保密钥长度为32字节（256位）
    this.encryptionKey = Buffer.from(encryptionKey.slice(0, 32).padEnd(32, '0'));
  }

  /**
   * 加密凭证
   */
  encryptCredentials(credentials: Record<string, any>): EncryptedCredentials {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      algorithm: this.algorithm,
    };
  }

  /**
   * 解密凭证
   */
  decryptCredentials(encrypted: EncryptedCredentials): DecryptedCredentials {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * 保存通道凭证
   */
  async saveChannelCredentials(
    subscriptionId: string,
    channelType: string,
    credentials: Record<string, any>
  ): Promise<void> {
    const encrypted = this.encryptCredentials(credentials);

    await this.prisma.channelCredential.upsert({
      where: {
        subscriptionId_channelType: {
          subscriptionId,
          channelType: channelType as any,
        },
      },
      update: {
        credentialsEncrypted: encrypted as any,
      },
      create: {
        subscriptionId,
        channelType: channelType as any,
        credentialsEncrypted: encrypted as any,
        isActive: true,
      },
    });

    console.log(`[Credentials] 通道凭证已保存: ${channelType}`);
  }

  /**
   * 获取通道凭证
   */
  async getChannelCredentials(
    subscriptionId: string,
    channelType: string
  ): Promise<DecryptedCredentials | null> {
    const credential = await this.prisma.channelCredential.findUnique({
      where: {
        subscriptionId_channelType: {
          subscriptionId,
          channelType: channelType as any,
        },
      },
    });

    if (!credential || !credential.isActive) {
      return null;
    }

    return this.decryptCredentials(credential.credentialsEncrypted as any);
  }

  /**
   * 获取所有活跃的通道凭证
   */
  async getActiveChannelCredentials(subscriptionId: string): Promise<Record<string, DecryptedCredentials>> {
    const credentials = await this.prisma.channelCredential.findMany({
      where: {
        subscriptionId,
        isActive: true,
      },
    });

    const result: Record<string, DecryptedCredentials> = {};
    credentials.forEach(cred => {
      result[cred.channelType] = this.decryptCredentials(cred.credentialsEncrypted as any);
    });

    return result;
  }

  /**
   * 生成Railway实例的完整环境变量配置
   */
  async generateInstanceEnvironment(
    subscriptionId: string,
    plan: 'BASIC' | 'PRO' | 'ENTERPRISE',
    userId: string,
    projectName: string
  ): Promise<Record<string, string>> {
    const environment: Record<string, string> = {};

    // 基础系统变量
    environment['NODE_ENV'] = 'production';
    environment['LOG_LEVEL'] = 'info';
    environment['ENVIRONMENT'] = plan.toLowerCase();

    // OpenClaw系统变量
    environment['OPENCLAW_USER_ID'] = userId;
    environment['OPENCLAW_SUBSCRIPTION_ID'] = subscriptionId;
    environment['OPENCLAW_PLAN'] = plan;
    environment['OPENCLAW_INSTANCE_NAME'] = projectName;
    environment['OPENCLAW_CREATED_AT'] = new Date().toISOString();

    // 获取所有通道凭证并添加
    const channelCredentials = await this.getActiveChannelCredentials(subscriptionId);
    Object.entries(channelCredentials).forEach(([channelType, credentials]) => {
      const envVarName = `${channelType.toUpperCase()}_CONFIG`;
      environment[envVarName] = JSON.stringify(credentials);

      // 同时添加单个凭证字段（如果存在）
      if (credentials.appId) {
        environment[`${channelType.toUpperCase()}_APP_ID`] = String(credentials.appId);
      }
      if (credentials.secret) {
        environment[`${channelType.toUpperCase()}_SECRET`] = String(credentials.secret);
      }
      if (credentials.token) {
        environment[`${channelType.toUpperCase()}_TOKEN`] = String(credentials.token);
      }
    });

    // 计划特定变量（特性限制）
    const features = this.getPlanFeatures(plan);
    environment['PLAN_MAX_INSTANCES'] = String(features.maxInstances);
    environment['PLAN_MAX_CHANNELS'] = String(features.maxChannels);
    environment['PLAN_MAX_BANDWIDTH'] = String(features.maxBandwidth);
    environment['PLAN_SUPPORT_LEVEL'] = features.supportLevel;

    return environment;
  }

  /**
   * 获取计划特性
   */
  private getPlanFeatures(plan: 'BASIC' | 'PRO' | 'ENTERPRISE') {
    const features: Record<string, any> = {
      BASIC: {
        maxInstances: 1,
        maxChannels: 3,
        maxBandwidth: 5,
        supportLevel: 'community',
      },
      PRO: {
        maxInstances: 5,
        maxChannels: 10,
        maxBandwidth: 50,
        supportLevel: 'priority',
      },
      ENTERPRISE: {
        maxInstances: -1, // unlimited
        maxChannels: -1,
        maxBandwidth: -1,
        supportLevel: 'vip',
      },
    };
    return features[plan];
  }

  /**
   * 验证通道凭证有效性
   */
  async validateChannelCredentials(
    channelType: string,
    credentials: Record<string, any>
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // 根据通道类型验证必需字段
      const requiredFields: Record<string, string[]> = {
        feishu: ['appId', 'secret'],
        dingtalk: ['appKey', 'appSecret'],
        wecom: ['corpId', 'secret'],
        telegram: ['token', 'botId'],
      };

      const required = requiredFields[channelType.toLowerCase()];
      if (!required) {
        return {
          valid: false,
          error: `Unknown channel type: ${channelType}`,
        };
      }

      for (const field of required) {
        if (!credentials[field]) {
          return {
            valid: false,
            error: `Missing required field: ${field}`,
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  /**
   * 更新通道凭证
   */
  async updateChannelCredentials(
    subscriptionId: string,
    channelType: string,
    credentials: Record<string, any>
  ): Promise<void> {
    // 先验证
    const validation = await this.validateChannelCredentials(channelType, credentials);
    if (!validation.valid) {
      throw new Error(`Credential validation failed: ${validation.error}`);
    }

    // 更新凭证
    await this.saveChannelCredentials(subscriptionId, channelType, credentials);
    console.log(`[Credentials] 通道凭证已更新: ${channelType}`);
  }

  /**
   * 禁用通道凭证
   */
  async disableChannelCredentials(subscriptionId: string, channelType: string): Promise<void> {
    await this.prisma.channelCredential.update({
      where: {
        subscriptionId_channelType: {
          subscriptionId,
          channelType: channelType as any,
        },
      },
      data: {
        isActive: false,
      },
    });

    console.log(`[Credentials] 通道凭证已禁用: ${channelType}`);
  }

  /**
   * 导出通道凭证配置（用于备份）
   */
  async exportCredentialsConfig(subscriptionId: string): Promise<Record<string, any>> {
    const credentials = await this.getActiveChannelCredentials(subscriptionId);
    return credentials;
  }

  /**
   * 导入通道凭证配置（从备份）
   */
  async importCredentialsConfig(subscriptionId: string, config: Record<string, any>): Promise<void> {
    for (const [channelType, credentials] of Object.entries(config)) {
      await this.updateChannelCredentials(subscriptionId, channelType, credentials as Record<string, any>);
    }

    console.log(`[Credentials] 已导入${Object.keys(config).length}个通道凭证`);
  }
}
