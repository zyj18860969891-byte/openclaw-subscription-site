import { alipayService, AlipayService } from './alipay-service';
import { wechatService, WechatService } from './wechat-service';
import { AppError } from '../../utils/errors';
import { prisma } from '../../database/prisma';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { RailwayCloneService } from '../railway/railway-clone-service';
import { RailwayClient } from '../railway/railway-client';

// 导入全局prisma实例
import { prisma as globalPrisma } from '../../database/prisma';

/**
 * 支付网关
 * 统一处理支付宝和微信支付的接口
 */

export type PaymentMethod = 'ALIPAY' | 'WECHAT';
export type TradeType = 'pc' | 'h5' | 'jsapi' | 'app' | 'H5' | 'JSAPI' | 'APP';

export interface CreatePaymentRequest {
  userId: string;
  subscriptionId?: string;
  planId?: string;
  amount: number;
  method: PaymentMethod;
  tradeType?: TradeType;
  openId?: string; // 微信JSAPI必需
}

export interface PaymentResult {
  outTradeNo: string;
  method: PaymentMethod;
  paymentUrl?: string;
  qrCode?: string;
  status: string;
}

export class PaymentGateway {
  private railwayCloneService: RailwayCloneService | null = null;
  
  constructor(
    private alipay: AlipayService,
    private wechat: WechatService,
    railwayClient?: RailwayClient,
    prisma?: PrismaClient
  ) {
    // 使用传入的prisma或全局prisma
    const prismaInstance = prisma || globalPrisma;
    
    // 如果提供了RailwayClient和Prisma，则初始化RailwayCloneService
    if (railwayClient && prismaInstance) {
      this.railwayCloneService = new RailwayCloneService(railwayClient, prismaInstance);
    } else if (process.env.RAILWAY_API_TOKEN && process.env.RAILWAY_TEMPLATE_PROJECT_ID && process.env.RAILWAY_TEMPLATE_SERVICE_ID) {
      // 如果环境变量存在，自动初始化RailwayCloneService
      try {
        const client = new RailwayClient(process.env.RAILWAY_API_TOKEN);
        this.railwayCloneService = new RailwayCloneService(client, prismaInstance);
        console.log('[PaymentGateway] RailwayCloneService自动初始化成功');
      } catch (error) {
        console.error('[PaymentGateway] RailwayCloneService初始化失败:', error);
        this.railwayCloneService = null;
      }
    }
  }

  /**
   * 创建支付订单
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    try {
      const outTradeNo = `${request.method.toUpperCase()}_${Date.now()}_${uuidv4().slice(0, 8)}`;

      // 保存支付记录到数据库
      await prisma.payment.create({
        data: {
          id: uuidv4(),
          userId: request.userId,
          subscriptionId: request.subscriptionId,
          amount: request.amount,
          paymentMethod: request.method,
          status: 'PENDING',
          orderId: outTradeNo,
        },
      });

      const notifyUrl = `${process.env.APP_URL}/api/payment/${request.method}/notify`;

      if (request.method === 'ALIPAY') {
        const result = await this.alipay.createPayment({
          userId: request.userId,
          subscriptionId: request.subscriptionId,
          planId: request.planId,
          outTradeNo,
          subject: `${request.planId || 'Subscription'} Plan`,
          totalAmount: request.amount,
          paymentMethod: (request.tradeType as 'pc' | 'h5' | 'jsapi') || 'pc',
          notifyUrl,
        });
        return {
          outTradeNo,
          method: 'ALIPAY',
          paymentUrl: result.paymentUrl,
          status: 'pending',
        };
      } else if (request.method === 'WECHAT') {
        const result = await this.wechat.createPayment({
          userId: request.userId,
          subscriptionId: request.subscriptionId,
          planId: request.planId,
          outTradeNo,
          description: `${request.planId || 'Subscription'} Plan`,
          totalAmount: request.amount,
          tradeType: (request.tradeType as 'H5' | 'JSAPI' | 'APP') || 'H5',
          openId: request.openId,
          notifyUrl,
        });
        return {
          outTradeNo,
          method: 'WECHAT',
          paymentUrl: result.paymentUrl,
          status: 'pending',
        };
      }

      throw new AppError('不支持的支付方式', 400, 'UNSUPPORTED_METHOD');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('创建支付订单失败', 500, 'CREATE_PAYMENT_ERROR');
    }
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(outTradeNo: string, method: PaymentMethod): Promise<{ status: string; tradeStatus: string }> {
    try {
      // Use method parameter if needed for different payment gateways
      console.log(`Querying payment status for ${outTradeNo} using ${method}`);
      
      const payment = await prisma.payment.findUnique({
        where: { orderId: outTradeNo },
      });

      if (!payment) {
        throw new AppError('支付记录不存在', 404, 'PAYMENT_NOT_FOUND');
      }

      return {
        status: payment.status,
        tradeStatus: payment.status,
      };
    } catch (error) {
      throw new AppError('查询支付状态失败', 500, 'PAYMENT_QUERY_ERROR');
    }
  }

  /**
   * 处理支付回调
   */
  async handleNotify(method: PaymentMethod, data: any): Promise<boolean> {
    try {
      // Use method parameter if needed for different payment gateways
      console.log(`Handling ${method} payment notification`);
      
      const { out_trade_no, trade_status } = data;

      // 更新支付状态
      await prisma.payment.update({
        where: { orderId: out_trade_no },
        data: {
          status: trade_status === 'TRADE_SUCCESS' || trade_status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          notifyTime: new Date(),
        },
      });

      // 如果支付成功，触发订阅激活和实例部署
      if (trade_status === 'TRADE_SUCCESS' || trade_status === 'SUCCESS') {
        await this.handleSuccessfulPayment(out_trade_no);
      }

      return true;
    } catch (error) {
      throw new AppError('处理支付回调失败', 500, 'PAYMENT_NOTIFY_ERROR');
    }
  }

  /**
   * 处理成功支付 - 激活订阅并触发Railway部署
   */
  private async handleSuccessfulPayment(outTradeNo: string): Promise<void> {
    try {
      console.log(`[Payment] 处理成功支付: ${outTradeNo}`);
      
      // 1. 获取支付记录
      const payment = await prisma.payment.findUnique({
        where: { orderId: outTradeNo },
        include: {
          subscription: {
            include: {
              channelCredentials: true,
            },
          },
          user: true,
        },
      });

      if (!payment || !payment.subscriptionId) {
        console.error(`[Payment] 支付记录不存在或缺少订阅: ${outTradeNo}`);
        return;
      }

      if (!payment.subscription) {
        console.error(`[Payment] 支付记录缺少订阅关联: ${outTradeNo}`);
        return;
      }

      console.log(`[Payment] 找到订阅: ${payment.subscriptionId}`);

      // 2. 激活订阅
      await prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
        },
      });
      console.log(`[Payment] 订阅已激活`);

      // 3. 准备通道凭证
      const channelCredentials: Record<string, any> = {};
      for (const cred of payment.subscription.channelCredentials) {
        channelCredentials[cred.channelType] = cred.credentialsEncrypted;
      }

      // 4. 如果配置了RailwayCloneService，触发部署
      if (this.railwayCloneService) {
        console.log(`[Payment] 开始触发Railway部署`);
        
        const cloneResult = await this.railwayCloneService.cloneAndCreateInstance({
          templateProjectId: process.env.RAILWAY_TEMPLATE_PROJECT_ID!,
          templateServiceId: process.env.RAILWAY_TEMPLATE_SERVICE_ID!,
          userId: payment.userId,
          subscriptionId: payment.subscriptionId,
          plan: payment.subscription.planType as 'BASIC' | 'PRO' | 'ENTERPRISE',
          channelCredentials,
        });

        if (cloneResult.success) {
          console.log(`[Payment] Railway部署成功: ${cloneResult.serviceId}`);
          
          // 5. 创建Railway实例记录
          await prisma.railwayInstance.create({
            data: {
              subscriptionId: payment.subscriptionId,
              userId: payment.userId,
              projectId: cloneResult.projectId,
              projectName: cloneResult.projectName,
              serviceId: cloneResult.serviceId,
              serviceName: cloneResult.serviceName,
              environmentId: cloneResult.environmentId,
              status: 'INITIALIZING',
              deploymentStatus: 'INITIALIZING',
              publicUrl: cloneResult.publicUrl || '',
              variables: cloneResult.variables || {},
            },
          });
        } else {
          console.error(`[Payment] Railway部署失败: ${cloneResult.errorDetails}`);
          // 部署失败不影响订阅激活，但需要记录
        }
      } else {
        console.log(`[Payment] RailwayCloneService未配置，跳过部署`);
      }
    } catch (error) {
      console.error(`[Payment] 处理成功支付失败:`, error);
      // 抛出错误让回调处理失败（支付方会重试）
      throw error;
    }
  }

  /**
   * 申请退款
   */
  async refund(outTradeNo: string, amount: number, reason: string): Promise<{ refundId: string; status: string }> {
    try {
      // Use reason parameter if needed for refund processing
      console.log(`Processing refund for ${outTradeNo}: ${reason}`);
      
      const refundId = `REFUND_${Date.now()}_${uuidv4().slice(0, 8)}`;

      // 更新支付记录中的退款信息
      await prisma.payment.update({
        where: { orderId: outTradeNo },
        data: {
          refundAmount: amount,
          refundTime: new Date(),
        },
      });

      return {
        refundId: refundId,
        status: 'pending',
      };
    } catch (error) {
      throw new AppError('退款申请失败', 500, 'REFUND_ERROR');
    }
  }
}

// 默认实例（不带Railway功能，用于向后兼容）
export const paymentGatewayInstance = new PaymentGateway(alipayService, wechatService);
