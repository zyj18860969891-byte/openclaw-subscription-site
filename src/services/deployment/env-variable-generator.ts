/**
 * 环境变量生成器
 * 将用户选择的通道信息转换为 Railway 环境变量
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 通道凭证接口
 */
interface ChannelCredential {
  id: string;
  channelType: string;
  channelName?: string;
  credentials: Record<string, string>;
  isActive: boolean;
  envVarNames?: Record<string, string>;
}

/**
 * 订阅信息接口
 */
interface SubscriptionInfo {
  id: string;
  userId: string;
  planType: 'basic' | 'pro' | 'enterprise';
  channelCredentials: ChannelCredential[];
}

/**
 * 生成的环境变量
 */
interface GeneratedEnvVariables {
  [key: string]: string;
}

/**
 * 环境变量生成器
 */
export class EnvVariableGenerator {
  /**
   * 根据订阅信息生成环境变量
   */
  static generateEnvVariables(subscription: SubscriptionInfo): GeneratedEnvVariables {
    const envVars: GeneratedEnvVariables = {};
    
    // 添加通用配置
    this.addCommonConfig(envVars, subscription);
    
    // 添加通道配置
    this.addChannelConfigs(envVars, subscription);
    
    return envVars;
  }

  /**
   * 添加通用配置
   */
  private static addCommonConfig(envVars: GeneratedEnvVariables, subscription: SubscriptionInfo): void {
    envVars['OPENCLAW_USER_ID'] = subscription.userId;
    envVars['OPENCLAW_SUBSCRIPTION_ID'] = subscription.id;
    envVars['OPENCLAW_PLAN'] = subscription.planType.toUpperCase();
    
    // 根据计划类型设置相应的限制
    switch (subscription.planType) {
      case 'basic':
        envVars['OPENCLAW_MAX_CHANNELS'] = '1';
        envVars['OPENCLAW_MAX_SKILLS'] = '10';
        envVars['OPENCLAW_STORAGE_LIMIT'] = '1GB';
        break;
      case 'pro':
        envVars['OPENCLAW_MAX_CHANNELS'] = '3';
        envVars['OPENCLAW_MAX_SKILLS'] = '50';
        envVars['OPENCLAW_STORAGE_LIMIT'] = '10GB';
        break;
      case 'enterprise':
        envVars['OPENCLAW_MAX_CHANNELS'] = '999'; // 无限制
        envVars['OPENCLAW_MAX_SKILLS'] = '999'; // 无限制
        envVars['OPENCLAW_STORAGE_LIMIT'] = '999GB'; // 无限制
        break;
    }
    
    // 添加时间戳
    envVars['OPENCLAW_DEPLOYED_AT'] = new Date().toISOString();
  }

  /**
   * 添加通道配置
   */
  private static addChannelConfigs(envVars: GeneratedEnvVariables, subscription: SubscriptionInfo): void {
    subscription.channelCredentials.forEach((credential, index) => {
      const varIndex = index + 1;
      
      switch (credential.channelType) {
        case 'feishu':
          this.addFeishuConfig(envVars, credential, varIndex);
          break;
        case 'dingtalk':
          this.addDingtalkConfig(envVars, credential, varIndex);
          break;
        case 'wecom':
          this.addWecomConfig(envVars, credential, varIndex);
          break;
        case 'telegram':
          this.addTelegramConfig(envVars, credential, varIndex);
          break;
        default:
          console.warn(`Unsupported channel type: ${credential.channelType}`);
      }
    });
  }

  /**
   * 添加飞书配置
   */
  private static addFeishuConfig(
    envVars: GeneratedEnvVariables, 
    credential: ChannelCredential, 
    index: number
  ): void {
    const prefix = `FEISHU_${index}`;
    
    // 必需字段
    envVars[`${prefix}_APP_ID`] = credential.credentials.appId || '';
    envVars[`${prefix}_APP_SECRET`] = credential.credentials.appSecret || '';
    
    // 可选字段
    if (credential.credentials.webhookToken) {
      envVars[`${prefix}_WEBHOOK_TOKEN`] = credential.credentials.webhookToken;
    }
    
    if (credential.credentials.encryptKey) {
      envVars[`${prefix}_ENCRYPT_KEY`] = credential.credentials.encryptKey;
    }
    
    if (credential.credentials.verifyToken) {
      envVars[`${prefix}_VERIFY_TOKEN`] = credential.credentials.verifyToken;
    }
    
    // 通道名称
    if (credential.channelName) {
      envVars[`${prefix}_CHANNEL_NAME`] = credential.channelName;
    }
    
    // 启用状态
    envVars[`${prefix}_ENABLED`] = credential.isActive ? 'true' : 'false';
  }

  /**
   * 添加钉钉配置
   */
  private static addDingtalkConfig(
    envVars: GeneratedEnvVariables, 
    credential: ChannelCredential, 
    index: number
  ): void {
    const prefix = `DINGTALK_${index}`;
    
    // 必需字段
    envVars[`${prefix}_APP_ID`] = credential.credentials.appId || '';
    envVars[`${prefix}_APP_SECRET`] = credential.credentials.appSecret || '';
    
    // 可选字段
    if (credential.credentials.webhookToken) {
      envVars[`${prefix}_WEBHOOK_TOKEN`] = credential.credentials.webhookToken;
    }
    
    if (credential.credentials.robotCode) {
      envVars[`${prefix}_ROBOT_CODE`] = credential.credentials.robotCode;
    }
    
    if (credential.credentials.chatId) {
      envVars[`${prefix}_CHAT_ID`] = credential.credentials.chatId;
    }
    
    // 通道名称
    if (credential.channelName) {
      envVars[`${prefix}_CHANNEL_NAME`] = credential.channelName;
    }
    
    // 启用状态
    envVars[`${prefix}_ENABLED`] = credential.isActive ? 'true' : 'false';
  }

  /**
   * 添加企业微信配置
   */
  private static addWecomConfig(
    envVars: GeneratedEnvVariables, 
    credential: ChannelCredential, 
    index: number
  ): void {
    const prefix = `WECOM_${index}`;
    
    // 必需字段
    envVars[`${prefix}_CORP_ID`] = credential.credentials.corpId || '';
    envVars[`${prefix}_SECRET`] = credential.credentials.secret || '';
    
    // 可选字段
    if (credential.credentials.agentId) {
      envVars[`${prefix}_AGENT_ID`] = credential.credentials.agentId;
    }
    
    if (credential.credentials.token) {
      envVars[`${prefix}_TOKEN`] = credential.credentials.token;
    }
    
    if (credential.credentials.encodingAesKey) {
      envVars[`${prefix}_ENCODING_AES_KEY`] = credential.credentials.encodingAesKey;
    }
    
    // 通道名称
    if (credential.channelName) {
      envVars[`${prefix}_CHANNEL_NAME`] = credential.channelName;
    }
    
    // 启用状态
    envVars[`${prefix}_ENABLED`] = credential.isActive ? 'true' : 'false';
  }

  /**
   * 添加Telegram配置
   */
  private static addTelegramConfig(
    envVars: GeneratedEnvVariables, 
    credential: ChannelCredential, 
    index: number
  ): void {
    const prefix = `TELEGRAM_${index}`;
    
    // 必需字段
    envVars[`${prefix}_BOT_TOKEN`] = credential.credentials.botToken || '';
    
    // 可选字段
    if (credential.credentials.chatId) {
      envVars[`${prefix}_CHAT_ID`] = credential.credentials.chatId;
    }
    
    if (credential.credentials.webhookUrl) {
      envVars[`${prefix}_WEBHOOK_URL`] = credential.credentials.webhookUrl;
    }
    
    // 通道名称
    if (credential.channelName) {
      envVars[`${prefix}_CHANNEL_NAME`] = credential.channelName;
    }
    
    // 启用状态
    envVars[`${prefix}_ENABLED`] = credential.isActive ? 'true' : 'false';
  }

  /**
   * 从数据库获取订阅信息并生成环境变量
   */
  static async generateFromDatabase(subscriptionId: string): Promise<GeneratedEnvVariables> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: true,
        channelCredentials: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const subscriptionInfo: SubscriptionInfo = {
      id: subscription.id,
      userId: subscription.userId,
      planType: subscription.planType as 'basic' | 'pro' | 'enterprise',
      channelCredentials: subscription.channelCredentials.map((cred: any) => ({
        id: cred.id,
        channelType: cred.channelType,
        channelName: cred.channelName,
        credentials: cred.credentialsEncrypted as any,
        isActive: cred.isActive,
        envVarNames: cred.envVarNames as any,
      })),
    };

    return this.generateEnvVariables(subscriptionInfo);
  }

  /**
   * 验证环境变量配置
   */
  static validateEnvVariables(envVars: GeneratedEnvVariables): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 检查必需的通用配置
    if (!envVars['OPENCLAW_USER_ID']) {
      errors.push('OPENCLAW_USER_ID is required');
    }
    
    if (!envVars['OPENCLAW_SUBSCRIPTION_ID']) {
      errors.push('OPENCLAW_SUBSCRIPTION_ID is required');
    }
    
    if (!envVars['OPENCLAW_PLAN']) {
      errors.push('OPENCLAW_PLAN is required');
    }
    
    // 检查通道配置
    const channelIndexes = this.getChannelIndexes(envVars);
    
    for (const index of channelIndexes) {
      const prefix = `FEISHU_${index}`;
      const dingtalkPrefix = `DINGTALK_${index}`;
      const wecomPrefix = `WECOM_${index}`;
      const telegramPrefix = `TELEGRAM_${index}`;
      
      // 检查至少有一个通道配置
      const hasFeishu = envVars[`${prefix}_APP_ID`] && envVars[`${prefix}_APP_SECRET`];
      const hasDingtalk = envVars[`${dingtalkPrefix}_APP_ID`] && envVars[`${dingtalkPrefix}_APP_SECRET`];
      const hasWecom = envVars[`${wecomPrefix}_CORP_ID`] && envVars[`${wecomPrefix}_SECRET`];
      const hasTelegram = envVars[`${telegramPrefix}_BOT_TOKEN`];
      
      if (!hasFeishu && !hasDingtalk && !hasWecom && !hasTelegram) {
        errors.push(`Channel ${index} has no valid configuration`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取通道索引列表
   */
  private static getChannelIndexes(envVars: GeneratedEnvVariables): number[] {
    const indexes = new Set<number>();
    
    Object.keys(envVars).forEach(key => {
      // 匹配 FEISHU_1, FEISHU_2, DINGTALK_1, DINGTALK_2 等
      const match = key.match(/^(FEISHU|DINGTALK|WECOM|TELERAM)_(\d+)_/);
      if (match) {
        indexes.add(parseInt(match[2]));
      }
    });
    
    return Array.from(indexes).sort();
  }

  /**
   * 生成环境变量配置文档
   */
  static generateConfigDocumentation(envVars: GeneratedEnvVariables): string {
    const lines: string[] = [];
    
    lines.push('# OpenClaw Railway 环境变量配置');
    lines.push('');
    lines.push('## 通用配置');
    lines.push('');
    
    // 通用配置
    const commonVars = [
      'OPENCLAW_USER_ID',
      'OPENCLAW_SUBSCRIPTION_ID', 
      'OPENCLAW_PLAN',
      'OPENCLAW_MAX_CHANNELS',
      'OPENCLAW_MAX_SKILLS',
      'OPENCLAW_STORAGE_LIMIT',
      'OPENCLAW_DEPLOYED_AT',
    ];
    
    commonVars.forEach(varName => {
      if (envVars[varName]) {
        lines.push(`${varName}=${envVars[varName]}`);
      }
    });
    
    lines.push('');
    lines.push('## 通道配置');
    lines.push('');
    
    // 通道配置
    const channelIndexes = this.getChannelIndexes(envVars);
    
    channelIndexes.forEach(index => {
      lines.push(`### 通道 ${index}`);
      lines.push('');
      
      const feishuPrefix = `FEISHU_${index}`;
      const dingtalkPrefix = `DINGTALK_${index}`;
      const wecomPrefix = `WECOM_${index}`;
      const telegramPrefix = `TELEGRAM_${index}`;
      
      if (envVars[`${feishuPrefix}_APP_ID`]) {
        lines.push(`#### 飞书配置`);
        lines.push(`FEISHU_${index}_APP_ID=${envVars[`${feishuPrefix}_APP_ID`]}`);
        lines.push(`FEISHU_${index}_APP_SECRET=${envVars[`${feishuPrefix}_APP_SECRET`]}`);
        if (envVars[`${feishuPrefix}_WEBHOOK_TOKEN`]) {
          lines.push(`FEISHU_${index}_WEBHOOK_TOKEN=${envVars[`${feishuPrefix}_WEBHOOK_TOKEN`]}`);
        }
        lines.push('');
      }
      
      if (envVars[`${dingtalkPrefix}_APP_ID`]) {
        lines.push(`#### 钉钉配置`);
        lines.push(`DINGTALK_${index}_APP_ID=${envVars[`${dingtalkPrefix}_APP_ID`]}`);
        lines.push(`DINGTALK_${index}_APP_SECRET=${envVars[`${dingtalkPrefix}_APP_SECRET`]}`);
        if (envVars[`${dingtalkPrefix}_WEBHOOK_TOKEN`]) {
          lines.push(`DINGTALK_${index}_WEBHOOK_TOKEN=${envVars[`${dingtalkPrefix}_WEBHOOK_TOKEN`]}`);
        }
        lines.push('');
      }
      
      if (envVars[`${wecomPrefix}_CORP_ID`]) {
        lines.push(`#### 企业微信配置`);
        lines.push(`WECOM_${index}_CORP_ID=${envVars[`${wecomPrefix}_CORP_ID`]}`);
        lines.push(`WECOM_${index}_SECRET=${envVars[`${wecomPrefix}_SECRET`]}`);
        if (envVars[`${wecomPrefix}_AGENT_ID`]) {
          lines.push(`WECOM_${index}_AGENT_ID=${envVars[`${wecomPrefix}_AGENT_ID`]}`);
        }
        lines.push('');
      }
      
      if (envVars[`${telegramPrefix}_BOT_TOKEN`]) {
        lines.push(`#### Telegram配置`);
        lines.push(`TELEGRAM_${index}_BOT_TOKEN=${envVars[`${telegramPrefix}_BOT_TOKEN`]}`);
        if (envVars[`${telegramPrefix}_CHAT_ID`]) {
          lines.push(`TELEGRAM_${index}_CHAT_ID=${envVars[`${telegramPrefix}_CHAT_ID`]}`);
        }
        lines.push('');
      }
    });
    
    return lines.join('\n');
  }
}

// 导出便捷函数
export const generateEnvVariables = EnvVariableGenerator.generateFromDatabase;