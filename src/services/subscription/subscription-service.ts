import prisma from '../database/prisma';
import { AppError } from '../../utils/errors';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

/**
 * 订阅服务
 * 处理用户订阅相关的所有业务逻辑
 */

export interface CreateSubscriptionRequest {
  userId: string;
  plan: SubscriptionPlan;
  autoRenew?: boolean;
}

export interface SubscriptionInfo {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlanInfo {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  price: number;
  billingCycle: number; // 月数
  features: string[];
  maxInstances: number;
  supportLevel: string;
}

export class SubscriptionService {
  /**
   * 获取订阅计划信息
   */
  getPlanInfo(plan: SubscriptionPlan): SubscriptionPlanInfo {
    const plans: Record<SubscriptionPlan, SubscriptionPlanInfo> = {
      BASIC: {
        plan: 'BASIC',
        name: 'Basic 基础版',
        description: '适合个人和小型团队',
        price: 49,
        billingCycle: 1,
        features: [
          '支持1个Railway实例',
          '基础技能支持',
          '社区技术支持',
          '每月5GB流量',
        ],
        maxInstances: 1,
        supportLevel: 'community',
      },
      PRO: {
        plan: 'PRO',
        name: 'Pro 专业版',
        description: '适合专业开发者和中型团队',
        price: 149,
        billingCycle: 1,
        features: [
          '支持5个Railway实例',
          '全部高级技能',
          '优先技术支持 (24小时响应)',
          '每月50GB流量',
          '自定义脚本支持',
          '数据分析和报告',
        ],
        maxInstances: 5,
        supportLevel: 'priority',
      },
      ENTERPRISE: {
        plan: 'ENTERPRISE',
        name: 'Enterprise 企业版',
        description: '为企业量身定制的完整解决方案',
        price: 499,
        billingCycle: 1,
        features: [
          '无限Railway实例',
          '全部高级技能 + 定制开发',
          '24/7 VIP技术支持',
          '无限流量',
          'API访问权限',
          '专属技术顾问',
          '自定义集成',
          '独立部署支持',
        ],
        maxInstances: 999,
        supportLevel: 'vip',
      },
    };

    return plans[plan];
  }

  /**
   * 创建订阅
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionInfo> {
    try {
      // 检查用户是否已有订阅
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId: request.userId,
          status: {
            in: ['ACTIVE', 'TRIAL'],
          },
        },
      });

      if (existingSubscription) {
        throw new AppError('用户已有有效订阅', 'SUBSCRIPTION_EXISTS', 400);
      }

      // 创建订阅
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const subscription = await prisma.subscription.create({
        data: {
          userId: request.userId,
          planType: request.plan as any,
          status: 'ACTIVE',
          startDate: now,
          endDate: endDate,
          renewalDate: endDate,
          isAutoRenew: request.autoRenew ?? true,
          priceAmount: 0,
          currency: 'USD',
        },
      });

      return this.formatSubscription(subscription);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('创建订阅失败', 'CREATE_SUBSCRIPTION_ERROR', 500);
    }
  }

  /**
   * 获取用户订阅
   */
  async getUserSubscription(userId: string): Promise<SubscriptionInfo | null> {
    try {
      const startTime = Date.now();
      
      // 优化查询：只获取最新的活跃订阅
      // 使用复合索引: [userId, status, createdAt]
      const subscription = await prisma.subscription.findFirst({
        where: { 
          userId: userId,
          status: 'ACTIVE' // 只查找活跃订阅，减少结果集
        },
        orderBy: { 
          createdAt: 'desc',
        },
        take: 1, // 明确限制只取1条
      });

      const queryTime = Date.now() - startTime;
      
      if (queryTime > 1000) {
        console.warn(`⚠️ [Subscription] 查询用户订阅耗时过长 (${queryTime}ms), userId: ${userId}`);
      } else {
        console.log(`✅ [Subscription] 查询用户订阅完成，耗时: ${queryTime}ms`);
      }

      if (!subscription) {
        return null;
      }

      // 检查订阅是否已过期
      if (subscription.status === 'ACTIVE' && subscription.renewalDate && subscription.renewalDate < new Date()) {
        // 更新订阅状态为已过期
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });
        return this.formatSubscription({ ...subscription, status: 'EXPIRED' });
      }

      return this.formatSubscription(subscription);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('获取订阅信息失败', 'GET_SUBSCRIPTION_ERROR', 500);
    }
  }

  /**
   * 升级订阅
   */
  async upgradeSubscription(userId: string, newPlan: SubscriptionPlan): Promise<SubscriptionInfo> {
    try {
      const currentSubscription = await prisma.subscription.findFirst({
        where: { userId: userId, status: 'ACTIVE' },
      });

      if (!currentSubscription) {
        throw new AppError('用户没有有效订阅', 'NO_ACTIVE_SUBSCRIPTION', 400);
      }

      if (currentSubscription.planType === newPlan) {
        throw new AppError('升级计划与当前计划相同', 'SAME_PLAN', 400);
      }

      // 更新订阅计划
      const updatedSubscription = await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: { planType: newPlan as any },
      });

      return this.formatSubscription(updatedSubscription);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('升级订阅失败', 'UPGRADE_SUBSCRIPTION_ERROR', 500);
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { userId: userId, status: 'ACTIVE' },
      });

      if (!subscription) {
        throw new AppError('用户没有有效订阅', 'NO_ACTIVE_SUBSCRIPTION', 400);
      }

      // 更新订阅状态
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          isAutoRenew: false,
        },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('取消订阅失败', 'CANCEL_SUBSCRIPTION_ERROR', 500);
    }
  }

  /**
   * 续费订阅
   */
  async renewSubscription(userId: string): Promise<SubscriptionInfo> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        throw new AppError('用户没有订阅', 'NO_SUBSCRIPTION', 404);
      }

      // 延长订阅期限
      const newEndDate = new Date(subscription.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      const renewedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          endDate: newEndDate,
          renewalDate: newEndDate,
          isAutoRenew: true,
        },
      });

      return this.formatSubscription(renewedSubscription);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('续费订阅失败', 'RENEW_SUBSCRIPTION_ERROR', 500);
    }
  }

  /**
   * 检查订阅是否有效
   */
  async isSubscriptionActive(userId: string): Promise<boolean> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: userId,
          status: 'ACTIVE',
          endDate: { gt: new Date() },
        },
      });

      return !!subscription;
    } catch (error) {
      console.error('检查订阅状态失败:', error);
      return false;
    }
  }

  /**
   * 获取订阅计划功能限制
   */
  getFeatureLimit(plan: SubscriptionPlan, feature: string): any {
    // Use planInfo if needed for future enhancements
    this.getPlanInfo(plan);

    const limits: Record<string, Record<string, any>> = {
      BASIC: {
        maxInstances: 1,
        maxApiCalls: 1000,
        maxStorage: 5, // GB
        supportResponse: 48, // hours
      },
      PRO: {
        maxInstances: 5,
        maxApiCalls: 50000,
        maxStorage: 50, // GB
        supportResponse: 24, // hours
      },
      ENTERPRISE: {
        maxInstances: 999,
        maxApiCalls: 999999,
        maxStorage: 1000, // GB
        supportResponse: 1, // hours
      },
    };

    return limits[plan][feature];
  }

  /**
   * 格式化订阅信息
   */
  private formatSubscription(subscription: any): SubscriptionInfo {
    return {
      id: subscription.id,
      userId: subscription.user_id,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      autoRenew: subscription.auto_renew,
      createdAt: subscription.created_at,
      updatedAt: subscription.updated_at,
    };
  }
}

// 导出单例
export const subscriptionService = new SubscriptionService();
