import { subscriptionService } from '../src/services/subscription/subscription-service';
import { SubscriptionPlan } from '@prisma/client';
import { AppError } from '../src/utils/errors';

// Mock Prisma
jest.mock('../src/services/database/prisma', () => ({
  prisma: {
    subscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const { prisma } = require('../src/services/database/prisma');

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlanInfo', () => {
    it('应该返回BASIC计划信息', () => {
      const planInfo = subscriptionService.getPlanInfo('BASIC');

      expect(planInfo.plan).toBe('BASIC');
      expect(planInfo.price).toBe(49);
      expect(planInfo.maxInstances).toBe(1);
      expect(planInfo.features).toHaveLength(4);
    });

    it('应该返回PRO计划信息', () => {
      const planInfo = subscriptionService.getPlanInfo('PRO');

      expect(planInfo.plan).toBe('PRO');
      expect(planInfo.price).toBe(149);
      expect(planInfo.maxInstances).toBe(5);
      expect(planInfo.features).toHaveLength(6);
    });

    it('应该返回ENTERPRISE计划信息', () => {
      const planInfo = subscriptionService.getPlanInfo('ENTERPRISE');

      expect(planInfo.plan).toBe('ENTERPRISE');
      expect(planInfo.price).toBe(499);
      expect(planInfo.maxInstances).toBe(999);
      expect(planInfo.features).toHaveLength(8);
    });
  });

  describe('createSubscription', () => {
    it('应该成功创建订阅', async () => {
      const userId = 'user123';
      const plan: SubscriptionPlan = 'PRO';

      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue({
        id: 'sub123',
        user_id: userId,
        plan,
        status: 'ACTIVE',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        auto_renew: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const subscription = await subscriptionService.createSubscription({
        userId,
        plan,
        autoRenew: true,
      });

      expect(subscription.userId).toBe(userId);
      expect(subscription.plan).toBe(plan);
      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.autoRenew).toBe(true);
    });

    it('应该拒绝用户已有有效订阅', async () => {
      const userId = 'user123';

      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub123',
        user_id: userId,
        status: 'ACTIVE',
      });

      await expect(
        subscriptionService.createSubscription({
          userId,
          plan: 'BASIC',
        })
      ).rejects.toThrow('用户已有有效订阅');
    });
  });

  describe('getUserSubscription', () => {
    it('应该返回用户的有效订阅', async () => {
      const userId = 'user123';
      const subscription = {
        id: 'sub123',
        user_id: userId,
        plan: 'PRO',
        status: 'ACTIVE',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000),
        auto_renew: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      prisma.subscription.findFirst.mockResolvedValue(subscription);

      const result = await subscriptionService.getUserSubscription(userId);

      expect(result).not.toBeNull();
      expect(result?.plan).toBe('PRO');
    });

    it('应该在订阅过期时更新状态', async () => {
      const userId = 'user123';
      const subscription = {
        id: 'sub123',
        user_id: userId,
        plan: 'BASIC',
        status: 'ACTIVE',
        current_period_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000), // 已过期
        auto_renew: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      prisma.subscription.findFirst.mockResolvedValue(subscription);
      prisma.subscription.update.mockResolvedValue({
        ...subscription,
        status: 'EXPIRED',
      });

      const result = await subscriptionService.getUserSubscription(userId);

      expect(result?.status).toBe('EXPIRED');
      expect(prisma.subscription.update).toHaveBeenCalled();
    });

    it('应该返回null当用户无订阅', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await subscriptionService.getUserSubscription('user123');

      expect(result).toBeNull();
    });
  });

  describe('upgradeSubscription', () => {
    it('应该成功升级订阅计划', async () => {
      const userId = 'user123';
      const currentSubscription = {
        id: 'sub123',
        user_id: userId,
        plan: 'BASIC',
        status: 'ACTIVE',
      };

      prisma.subscription.findFirst.mockResolvedValue(currentSubscription);
      prisma.subscription.update.mockResolvedValue({
        ...currentSubscription,
        plan: 'PRO',
      });

      const result = await subscriptionService.upgradeSubscription(userId, 'PRO');

      expect(result.plan).toBe('PRO');
      expect(prisma.subscription.update).toHaveBeenCalled();
    });

    it('应该拒绝升级到相同计划', async () => {
      const userId = 'user123';

      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub123',
        user_id: userId,
        plan: 'PRO',
        status: 'ACTIVE',
      });

      await expect(
        subscriptionService.upgradeSubscription(userId, 'PRO')
      ).rejects.toThrow('升级计划与当前计划相同');
    });
  });

  describe('cancelSubscription', () => {
    it('应该成功取消订阅', async () => {
      const userId = 'user123';

      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub123',
        user_id: userId,
        status: 'ACTIVE',
      });

      prisma.subscription.update.mockResolvedValue({
        status: 'CANCELLED',
        auto_renew: false,
      });

      await subscriptionService.cancelSubscription(userId);

      expect(prisma.subscription.update).toHaveBeenCalled();
    });

    it('应该拒绝取消不存在的订阅', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(subscriptionService.cancelSubscription('user123')).rejects.toThrow(
        '用户没有有效订阅'
      );
    });
  });

  describe('isSubscriptionActive', () => {
    it('应该在订阅有效时返回true', async () => {
      const userId = 'user123';

      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub123',
        user_id: userId,
        status: 'ACTIVE',
      });

      const result = await subscriptionService.isSubscriptionActive(userId);

      expect(result).toBe(true);
    });

    it('应该在订阅无效时返回false', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await subscriptionService.isSubscriptionActive('user123');

      expect(result).toBe(false);
    });
  });

  describe('getFeatureLimit', () => {
    it('应该返回BASIC计划的功能限制', () => {
      const limits = {
        maxInstances: subscriptionService.getFeatureLimit('BASIC', 'maxInstances'),
        maxApiCalls: subscriptionService.getFeatureLimit('BASIC', 'maxApiCalls'),
        maxStorage: subscriptionService.getFeatureLimit('BASIC', 'maxStorage'),
      };

      expect(limits.maxInstances).toBe(1);
      expect(limits.maxApiCalls).toBe(1000);
      expect(limits.maxStorage).toBe(5);
    });

    it('应该返回PRO计划的功能限制', () => {
      const limits = {
        maxInstances: subscriptionService.getFeatureLimit('PRO', 'maxInstances'),
        maxApiCalls: subscriptionService.getFeatureLimit('PRO', 'maxApiCalls'),
        maxStorage: subscriptionService.getFeatureLimit('PRO', 'maxStorage'),
      };

      expect(limits.maxInstances).toBe(5);
      expect(limits.maxApiCalls).toBe(50000);
      expect(limits.maxStorage).toBe(50);
    });

    it('应该返回ENTERPRISE计划的功能限制', () => {
      const limits = {
        maxInstances: subscriptionService.getFeatureLimit('ENTERPRISE', 'maxInstances'),
        maxApiCalls: subscriptionService.getFeatureLimit('ENTERPRISE', 'maxApiCalls'),
        maxStorage: subscriptionService.getFeatureLimit('ENTERPRISE', 'maxStorage'),
      };

      expect(limits.maxInstances).toBe(999);
      expect(limits.maxApiCalls).toBe(999999);
      expect(limits.maxStorage).toBe(1000);
    });
  });
});
