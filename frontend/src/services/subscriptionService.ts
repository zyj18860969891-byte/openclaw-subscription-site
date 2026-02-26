import { apiClient } from './apiClient';
import type { SubscriptionPlan, ChannelType } from '../types';

export interface CreateSubscriptionRequest {
  planType: SubscriptionPlan;
  channelCredentials: Array<{
    channelType: ChannelType;
    credentials: Record<string, string>;
  }>;
}

export interface Subscription {
  id: string;
  userId: string;
  planType: SubscriptionPlan;
  priceAmount: number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  renewalDate?: string;
  isAutoRenew: boolean;
  trialEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeature {
  name: string;
  description?: string;
  included: boolean;
}

export interface SubscriptionPlanDetails {
  planType: SubscriptionPlan;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  billingCycle: string;
  features: PlanFeature[];
  limits: {
    maxInstances: number;
    maxChannels: number;
    maxApiCalls: number;
    storageGB: number;
  };
}

export const subscriptionService = {
  /**
   * 获取所有订阅计划
   */
  async getPlans(): Promise<SubscriptionPlanDetails[]> {
    const response = await apiClient.get('/subscription/plans');
    return response.data.data;
  },

  /**
   * 获取单个计划详情
   */
  async getPlan(plan: SubscriptionPlan): Promise<SubscriptionPlanDetails> {
    const response = await apiClient.get(`/subscription/plans/${plan}`);
    return response.data.data;
  },

  /**
   * 获取当前用户的订阅
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      const response = await apiClient.get('/subscription/current');
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * 创建新订阅
   */
  async createSubscription(data: CreateSubscriptionRequest): Promise<Subscription> {
    const response = await apiClient.post('/subscription/create', data);
    return response.data.data;
  },

  /**
   * 升级订阅
   */
  async upgradeSubscription(planType: SubscriptionPlan): Promise<Subscription> {
    const response = await apiClient.put('/subscription/upgrade', { planType });
    return response.data.data;
  },

  /**
   * 取消订阅
   */
  async cancelSubscription(): Promise<void> {
    await apiClient.post('/subscription/cancel');
  },

  /**
   * 续费订阅
   */
  async renewSubscription(): Promise<Subscription> {
    const response = await apiClient.post('/subscription/renew');
    return response.data.data;
  },

  /**
   * 检查订阅状态
   */
  async checkSubscriptionStatus(): Promise<{ active: boolean; plan?: SubscriptionPlan }> {
    const response = await apiClient.get('/subscription/active');
    return response.data.data;
  },
};