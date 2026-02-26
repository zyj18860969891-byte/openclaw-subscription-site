import { EnvVariableGenerator } from '../../src/services/deployment/env-variable-generator';

describe('EnvVariableGenerator', () => {
  describe('generateEnvVariables', () => {
    const mockSubscription = {
      id: 'sub_123',
      userId: 'user_123',
      planType: 'basic' as const,
      channelCredentials: [
        {
          id: 'cred_1',
          channelType: 'feishu' as const,
          channelName: 'Test Feishu',
          credentials: {
            appId: 'cli_test_123',
            appSecret: 'test_secret_123',
            webhookToken: 'test_webhook_token',
            encryptKey: 'test_encrypt_key',
          },
          isActive: true,
        },
        {
          id: 'cred_2',
          channelType: 'dingtalk' as const,
          channelName: 'Test DingTalk',
          credentials: {
            appId: 'ding_test_456',
            appSecret: 'ding_secret_456',
            webhookToken: 'ding_webhook_token',
            robotCode: 'robot_123',
            chatId: 'chat_456',
          },
          isActive: true,
        },
        {
          id: 'cred_3',
          channelType: 'telegram' as const,
          credentials: {
            botToken: '123456789:ABCdefGHijklMNOpqrsTuVwxyz',
            chatId: 'chat_789',
          },
          isActive: false,
        },
      ],
    };

    it('should generate correct environment variables for basic plan', () => {
      const envVars = EnvVariableGenerator.generateEnvVariables(mockSubscription);

      // Check common variables
      expect(envVars['OPENCLAW_USER_ID']).toBe('user_123');
      expect(envVars['OPENCLAW_SUBSCRIPTION_ID']).toBe('sub_123');
      expect(envVars['OPENCLAW_PLAN']).toBe('BASIC');
      expect(envVars['OPENCLAW_MAX_CHANNELS']).toBe('1');
      expect(envVars['OPENCLAW_MAX_SKILLS']).toBe('10');
      expect(envVars['OPENCLAW_STORAGE_LIMIT']).toBe('1GB');
      expect(envVars['OPENCLAW_DEPLOYED_AT']).toBeDefined();

      // Check Feishu configuration (channel 1)
      expect(envVars['FEISHU_1_APP_ID']).toBe('cli_test_123');
      expect(envVars['FEISHU_1_APP_SECRET']).toBe('test_secret_123');
      expect(envVars['FEISHU_1_WEBHOOK_TOKEN']).toBe('test_webhook_token');
      expect(envVars['FEISHU_1_ENCRYPT_KEY']).toBe('test_encrypt_key');
      expect(envVars['FEISHU_1_CHANNEL_NAME']).toBe('Test Feishu');
      expect(envVars['FEISHU_1_ENABLED']).toBe('true');

      // Check DingTalk configuration (channel 2)
      expect(envVars['DINGTALK_2_APP_ID']).toBe('ding_test_456');
      expect(envVars['DINGTALK_2_APP_SECRET']).toBe('ding_secret_456');
      expect(envVars['DINGTALK_2_WEBHOOK_TOKEN']).toBe('ding_webhook_token');
      expect(envVars['DINGTALK_2_ROBOT_CODE']).toBe('robot_123');
      expect(envVars['DINGTALK_2_CHAT_ID']).toBe('chat_456');
      expect(envVars['DINGTALK_2_CHANNEL_NAME']).toBe('Test DingTalk');
      expect(envVars['DINGTALK_2_ENABLED']).toBe('true');

      // Check Telegram configuration (channel 3, disabled)
      expect(envVars['TELEGRAM_3_BOT_TOKEN']).toBe('123456789:ABCdefGHijklMNOpqrsTuVwxyz');
      expect(envVars['TELEGRAM_3_CHAT_ID']).toBe('chat_789');
      expect(envVars['TELEGRAM_3_ENABLED']).toBe('false');

      // Should not have duplicate keys
      const keys = Object.keys(envVars);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('should generate correct environment variables for pro plan', () => {
      const proSubscription = { ...mockSubscription, planType: 'pro' as const };
      const envVars = EnvVariableGenerator.generateEnvVariables(proSubscription);

      expect(envVars['OPENCLAW_PLAN']).toBe('PRO');
      expect(envVars['OPENCLAW_MAX_CHANNELS']).toBe('3');
      expect(envVars['OPENCLAW_MAX_SKILLS']).toBe('50');
      expect(envVars['OPENCLAW_STORAGE_LIMIT']).toBe('10GB');
    });

    it('should generate correct environment variables for enterprise plan', () => {
      const enterpriseSubscription = { ...mockSubscription, planType: 'enterprise' as const };
      const envVars = EnvVariableGenerator.generateEnvVariables(enterpriseSubscription);

      expect(envVars['OPENCLAW_PLAN']).toBe('ENTERPRISE');
      expect(envVars['OPENCLAW_MAX_CHANNELS']).toBe('999');
      expect(envVars['OPENCLAW_MAX_SKILLS']).toBe('999');
      expect(envVars['OPENCLAW_STORAGE_LIMIT']).toBe('999GB');
    });

    it('should handle empty channel credentials', () => {
      const emptySubscription = { ...mockSubscription, channelCredentials: [] };
      const envVars = EnvVariableGenerator.generateEnvVariables(emptySubscription);

      expect(envVars['OPENCLAW_USER_ID']).toBe('user_123');
      expect(envVars['OPENCLAW_PLAN']).toBe('BASIC');
      // Should not have any channel-specific variables
      const channelVars = Object.keys(envVars).filter(key => 
        key.startsWith('FEISHU_') || 
        key.startsWith('DINGTALK_') || 
        key.startsWith('WECOM_') || 
        key.startsWith('TELEGRAM_')
      );
      expect(channelVars.length).toBe(0);
    });

    it('should handle unsupported channel types', () => {
      const unsupportedSubscription = {
        ...mockSubscription,
        channelCredentials: [
          {
            ...mockSubscription.channelCredentials[0],
            channelType: 'slack' as any,
          },
        ],
      };
      const envVars = EnvVariableGenerator.generateEnvVariables(unsupportedSubscription);

      expect(envVars['OPENCLAW_USER_ID']).toBe('user_123');
      // Should not have Slack-specific variables
      expect(envVars['SLACK_1_APP_ID']).toBeUndefined();
    });
  });

  describe('validateEnvVariables', () => {
    it('should validate correct environment variables', () => {
      const validEnvVars = {
        OPENCLAW_USER_ID: 'user_123',
        OPENCLAW_SUBSCRIPTION_ID: 'sub_123',
        OPENCLAW_PLAN: 'BASIC',
        FEISHU_1_APP_ID: 'cli_test_123',
        FEISHU_1_APP_SECRET: 'test_secret',
      };

      const result = EnvVariableGenerator.validateEnvVariables(validEnvVars);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing required variables', () => {
      const invalidEnvVars = {
        OPENCLAW_USER_ID: 'user_123',
        // Missing OPENCLAW_SUBSCRIPTION_ID and OPENCLAW_PLAN
        FEISHU_1_APP_ID: 'cli_test_123',
        FEISHU_1_APP_SECRET: 'test_secret',
      };

      const result = EnvVariableGenerator.validateEnvVariables(invalidEnvVars);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OPENCLAW_SUBSCRIPTION_ID is required');
      expect(result.errors).toContain('OPENCLAW_PLAN is required');
    });

    it('should detect invalid channel configuration', () => {
      const invalidEnvVars = {
        OPENCLAW_USER_ID: 'user_123',
        OPENCLAW_SUBSCRIPTION_ID: 'sub_123',
        OPENCLAW_PLAN: 'BASIC',
        FEISHU_1_APP_ID: '', // Empty appId
        FEISHU_1_APP_SECRET: 'test_secret',
        DINGTALK_2_APP_ID: 'ding_test_456',
        // Missing DINGTALK_2_APP_SECRET
      };

      const result = EnvVariableGenerator.validateEnvVariables(invalidEnvVars);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Channel 2 has no valid configuration');
    });

    it('should handle completely empty configuration', () => {
      const emptyEnvVars = {};

      const result = EnvVariableGenerator.validateEnvVariables(emptyEnvVars);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OPENCLAW_USER_ID is required');
      expect(result.errors).toContain('OPENCLAW_SUBSCRIPTION_ID is required');
      expect(result.errors).toContain('OPENCLAW_PLAN is required');
    });
  });

  describe('getChannelIndexes', () => {
    it('should extract correct channel indexes', () => {
      const envVars = {
        FEISHU_1_APP_ID: 'test1',
        FEISHU_1_APP_SECRET: 'secret1',
        FEISHU_2_APP_ID: 'test2',
        FEISHU_2_APP_SECRET: 'secret2',
        DINGTALK_1_APP_ID: 'ding1',
        DINGTALK_1_APP_SECRET: 'ding_secret1',
        TELEGRAM_3_BOT_TOKEN: 'bot3',
        OPENCLAW_USER_ID: 'user123',
      };

      const indexes = EnvVariableGenerator['getChannelIndexes'](envVars);

      expect(indexes).toEqual([1, 2, 3]);
      expect(indexes).toHaveLength(3);
    });

    it('should handle mixed channel types', () => {
      const envVars = {
        FEISHU_1_APP_ID: 'test1',
        DINGTALK_1_APP_ID: 'ding1',
        WECOM_2_CORP_ID: 'wecom2',
        TELEGRAM_2_BOT_TOKEN: 'bot2',
        OPENCLAW_USER_ID: 'user123',
      };

      const indexes = EnvVariableGenerator['getChannelIndexes'](envVars);

      expect(indexes).toEqual([1, 2]);
    });

    it('should handle empty environment variables', () => {
      const envVars = {
        OPENCLAW_USER_ID: 'user123',
      };

      const indexes = EnvVariableGenerator['getChannelIndexes'](envVars);

      expect(indexes).toEqual([]);
    });
  });

  describe('generateConfigDocumentation', () => {
    it('should generate comprehensive documentation', () => {
      const envVars = {
        OPENCLAW_USER_ID: 'user_123',
        OPENCLAW_SUBSCRIPTION_ID: 'sub_123',
        OPENCLAW_PLAN: 'BASIC',
        OPENCLAW_MAX_CHANNELS: '1',
        FEISHU_1_APP_ID: 'cli_test_123',
        FEISHU_1_APP_SECRET: 'test_secret',
        FEISHU_1_WEBHOOK_TOKEN: 'test_webhook',
        DINGTALK_2_APP_ID: 'ding_test_456',
        DINGTALK_2_APP_SECRET: 'ding_secret',
      };

      const documentation = EnvVariableGenerator.generateConfigDocumentation(envVars);

      expect(documentation).toContain('# OpenClaw Railway 环境变量配置');
      expect(documentation).toContain('## 通用配置');
      expect(documentation).toContain('OPENCLAW_USER_ID=user_123');
      expect(documentation).toContain('OPENCLAW_PLAN=BASIC');
      expect(documentation).toContain('## 通道配置');
      expect(documentation).toContain('### 通道 1');
      expect(documentation).toContain('#### 飞书配置');
      expect(documentation).toContain('FEISHU_1_APP_ID=cli_test_123');
      expect(documentation).toContain('FEISHU_1_APP_SECRET=test_secret');
      expect(documentation).toContain('### 通道 2');
      expect(documentation).toContain('#### 钉钉配置');
      expect(documentation).toContain('DINGTALK_2_APP_ID=ding_test_456');
    });

    it('should handle documentation with no channels', () => {
      const envVars = {
        OPENCLAW_USER_ID: 'user_123',
        OPENCLAW_SUBSCRIPTION_ID: 'sub_123',
        OPENCLAW_PLAN: 'BASIC',
      };

      const documentation = EnvVariableGenerator.generateConfigDocumentation(envVars);

      expect(documentation).toContain('# OpenClaw Railway 环境变量配置');
      expect(documentation).toContain('## 通用配置');
      expect(documentation).toContain('OPENCLAW_USER_ID=user_123');
      expect(documentation).toContain('## 通道配置');
      expect(documentation).not.toContain('### 通道');
    });
  });
});