import { v4 as uuidv4 } from 'uuid';
import AlipaySdk from 'alipay-sdk';
import { AppError } from '../../utils/errors';
import { prisma } from '../../database/prisma';

/**
 * 支付宝服务
 * 使用 alipay-sdk 实现真实的支付宝支付集成
 */

export interface CreatePaymentParams {
  userId: string;
  subscriptionId?: string;
  planId?: string;
  outTradeNo?: string;
  subject: string;
  totalAmount: number;
  description?: string;
  returnUrl?: string;
  notifyUrl?: string;
  paymentMethod: 'pc' | 'h5' | 'jsapi';
}

export interface RefundParams {
  outTradeNo: string;
  refundAmount: number;
  refundReason: string;
}

export interface QueryResult {
  tradeNo?: string;
  outTradeNo: string;
  tradeStatus: string;
  totalAmount?: number;
}

export interface RefundResult {
  refundNo: string;
  outTradeNo: string;
  refundAmount: number;
  refundStatus: string;
}

export interface PaymentResponse {
  paymentId: string;
  outTradeNo: string;
  amount: number;
  subject: string;
  paymentUrl?: string;
  qrCode?: string;
  status: string;
  createdAt: string;
}

export class AlipayService {
  private alipaySdk: any;
  private appId: string;
  private privateKey: string;
  private alipayPublicKey: string;
  private gatewayUrl: string;

  constructor() {
    // 从环境变量读取配置
    this.appId = process.env.ALIPAY_APP_ID || '';
    this.privateKey = process.env.ALIPAY_PRIVATE_KEY || '';
    this.alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY || '';
    this.gatewayUrl = process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipay.com/gateway.do';

    // 验证必需配置
    if (!this.appId || !this.privateKey || !this.alipayPublicKey) {
      console.warn('⚠️ Alipay credentials not fully configured');
      this.alipaySdk = null;
    } else {
      // 初始化支付宝 SDK
      this.alipaySdk = new AlipaySdk({
        appId: this.appId,
        privateKey: this.privateKey,
        alipayPublicKey: this.alipayPublicKey,
        signType: 'RSA2',
        gateway: this.gatewayUrl,
        timeout: 5000,
        // 生产环境建议启用以下选项
        // verify: true, // 验证响应
        // encryptType: 'AES', // 加密类型
      });
      console.log('✅ Alipay SDK initialized successfully');
    }
  }


  /**
   * 创建支付订单（统一入口）
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    const outTradeNo = params.outTradeNo || `ALI_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const paymentId = uuidv4();

    // 记录支付到数据库
    await prisma.payment.create({
      data: {
        id: paymentId,
        userId: params.userId,
        subscriptionId: params.subscriptionId,
        amount: params.totalAmount,
        paymentMethod: 'ALIPAY',
        status: 'PENDING',
        orderId: outTradeNo,
      },
    });

    // 如果 SDK 未初始化，返回模拟数据（开发环境）
    if (!this.alipaySdk) {
      console.warn('⚠️ Alipay SDK not initialized, returning mock payment URL');
      const mockUrl = this.getMockPaymentUrl(outTradeNo, params);
      return {
        paymentId,
        outTradeNo,
        amount: params.totalAmount,
        subject: params.subject,
        paymentUrl: mockUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    }

    try {
      // 构建支付宝支付参数
      const bizContent: any = {
        out_trade_no: outTradeNo,
        total_amount: params.totalAmount.toFixed(2),
        subject: params.subject,
        product_code: 'FAST_INSTANT_TRADE_PAY',
      };

      // 根据支付方式设置不同参数
      switch (params.paymentMethod) {
        case 'pc':
          bizContent.qr_pay_mode = 1; // PC网站支付
          break;
        case 'h5':
          bizContent.qr_pay_mode = 2; // H5支付
          break;
        case 'jsapi':
          bizContent.product_code = 'JSAPI';
          // JSAPI 需要传递 buyer_id 或 open_id
          // 这里需要根据实际情况传递用户标识
          break;
      }

      // 调用支付宝 SDK 生成支付参数
      const result = await this.alipaySdk.pageExec(
        'alipay.trade.page.pay',
        {
          method: 'POST',
          bizContent,
          returnUrl: params.returnUrl || process.env.APP_URL,
          notifyUrl: params.notifyUrl || `${process.env.APP_URL}/api/payment/alipay/notify`,
        }
      );

      // 返回支付 URL
      const paymentUrl = result; // SDK 返回的是完整的支付 URL

      return {
        paymentId,
        outTradeNo,
        amount: params.totalAmount,
        subject: params.subject,
        paymentUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Alipay payment creation failed:', error);
      throw new AppError('创建支付宝支付失败', 500, 'ALIPAY_CREATE_FAILED');
    }
  }


  /**
   * 获取模拟支付 URL（开发环境使用）
   */
  private getMockPaymentUrl(outTradeNo: string, params: CreatePaymentParams): string {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const query = new URLSearchParams({
      outTradeNo,
      amount: params.totalAmount.toFixed(2),
      subject: params.subject,
      method: 'alipay',
      paymentMethod: params.paymentMethod,
    });
    return `${baseUrl}/payment/mock/alipay?${query.toString()}`;
  }









  /**
   * 查询支付状态
   */
  async queryPaymentStatus(outTradeNo: string): Promise<QueryResult> {
    try {
      // 先查询本地数据库
      const payment = await prisma.payment.findUnique({
        where: { orderId: outTradeNo },
      });

      if (!payment) {
        throw new AppError('支付记录不存在', 404, 'PAYMENT_NOT_FOUND');
      }

      // 如果 SDK 未初始化，返回本地状态
      if (!this.alipaySdk) {
        console.warn('⚠️ Alipay SDK not initialized, returning local payment status');
        return {
          outTradeNo,
          tradeStatus: payment.status,
          totalAmount: payment.amount,
        };
      }

      // 调用支付宝 API 查询支付状态
      const result = await this.alipaySdk.exec(
        'alipay.trade.query',
        {
          method: 'POST',
          bizContent: {
            out_trade_no: outTradeNo,
          },
        }
      );

      // 解析响应
      const response = typeof result === 'string' ? JSON.parse(result) : result;
      const tradeStatus = response.alipay_trade_query_response?.trade_status || 'UNKNOWN';

      // 更新本地支付状态（可选）
      const status = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED' 
        ? 'SUCCESS' 
        : tradeStatus === 'TRADE_CLOSED' 
        ? 'FAILED' 
        : 'PENDING';

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status },
      });

      return {
        outTradeNo,
        tradeStatus: status,
        totalAmount: payment.amount,
      };
    } catch (error: any) {
      console.error('Alipay query failed:', error);
      throw new AppError('查询支付状态失败', 500, 'ALIPAY_QUERY_FAILED');
    }
  }


  /**
   * 处理支付回调（包括签名验证）
   */
  async handleNotify(data: any, _headers?: any): Promise<boolean> {
    try {
      // 支付宝回调参数
      const { out_trade_no, trade_status } = data;

      // 如果 SDK 未初始化，直接处理（无签名验证）
      if (!this.alipaySdk) {
        console.warn('⚠️ Alipay SDK not initialized, processing callback without signature verification');
        await this.processPaymentNotification(out_trade_no, trade_status);
        return true;
      }

      // 验证回调签名（支付宝回调通过 headers 传递签名）
      // 注意：支付宝回调的签名验证方式与微信不同
      // 支付宝使用 POST 参数 + 签名参数进行验证
      const sign = data.sign || data.sign_type; // 支付宝回调参数中可能包含签名
      
      if (sign) {
        try {
          // 使用 SDK 验证签名
          const verified = this.alipaySdk.checkNotifySign(data);
          if (!verified) {
            throw new AppError('支付宝回调签名验证失败', 400, 'ALIPAY_SIGNATURE_INVALID');
          }
          console.log('✅ Alipay callback signature verified successfully');
        } catch (error) {
          console.error('Alipay signature verification error:', error);
          throw new AppError('支付宝回调签名验证失败', 400, 'ALIPAY_SIGNATURE_INVALID');
        }
      } else {
        console.warn('⚠️ No signature found in Alipay callback, skipping verification');
      }

      // 处理支付通知
      await this.processPaymentNotification(out_trade_no, trade_status);

      return true;
    } catch (error: any) {
      console.error('Alipay notify handling failed:', error);
      throw new AppError('处理支付宝回调失败', 500, 'ALIPAY_NOTIFY_FAILED');
    }
  }

  /**
   * 处理支付通知（更新状态和触发部署）
   */
  private async processPaymentNotification(outTradeNo: string, tradeStatus: string): Promise<void> {
    try {
      // 更新支付状态
      const status = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED' 
        ? 'SUCCESS' 
        : tradeStatus === 'TRADE_CLOSED' 
        ? 'FAILED' 
        : 'PENDING';

      await prisma.payment.update({
        where: { orderId: outTradeNo },
        data: {
          status,
          notifyTime: new Date(),
        },
      });

      console.log(`[Alipay] Payment ${outTradeNo} status updated to ${status}`);

      // 如果支付成功，触发订阅激活和实例部署
      if (status === 'SUCCESS') {
        await this.handleSuccessfulPayment(outTradeNo);
      }
    } catch (error) {
      console.error('[Alipay] Failed to process payment notification:', error);
      throw error;
    }
  }

  /**
   * 处理成功支付（复用支付网关的逻辑）
   */
  private async handleSuccessfulPayment(outTradeNo: string): Promise<void> {
    try {
      console.log(`[Alipay] 处理成功支付: ${outTradeNo}`);
      
      // 获取支付记录
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
        console.error(`[Alipay] 支付记录不存在或缺少订阅: ${outTradeNo}`);
        return;
      }

      if (!payment.subscription) {
        console.error(`[Alipay] 支付记录缺少订阅关联: ${outTradeNo}`);
        return;
      }

      console.log(`[Alipay] 找到订阅: ${payment.subscriptionId}`);

      // 激活订阅
      await prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
        },
      });
      console.log(`[Alipay] 订阅已激活`);

      // 准备通道凭证
      const channelCredentials: Record<string, any> = {};
      for (const cred of payment.subscription.channelCredentials) {
        channelCredentials[cred.channelType] = cred.credentialsEncrypted;
      }

      // 注意：RailwayCloneService 的触发逻辑在 PaymentGateway 中统一处理
      // 这里只需要更新支付状态和订阅状态即可
      console.log(`[Alipay] 支付成功，等待 PaymentGateway 触发部署`);
    } catch (error) {
      console.error(`[Alipay] 处理成功支付失败:`, error);
      throw error;
    }
  }


  /**
   * 申请退款
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const refundId = `REFUND_${Date.now()}_${uuidv4().slice(0, 8)}`;

      // 如果 SDK 未初始化，返回模拟结果
      if (!this.alipaySdk) {
        console.warn('⚠️ Alipay SDK not initialized, returning mock refund');
        await prisma.payment.update({
          where: { orderId: params.outTradeNo },
          data: {
            refundAmount: params.refundAmount,
            refundTime: new Date(),
          },
        });
        return {
          refundNo: refundId,
          outTradeNo: params.outTradeNo,
          refundAmount: params.refundAmount,
          refundStatus: 'pending',
        };
      }

      // 调用支付宝退款 API
      const result = await this.alipaySdk.exec(
        'alipay.trade.refund',
        {
          method: 'POST',
          bizContent: {
            out_trade_no: params.outTradeNo,
            out_request_no: refundId,
            refund_amount: params.refundAmount.toFixed(2),
            refund_reason: params.refundReason,
          },
        }
      );

      // 解析响应
      const response = typeof result === 'string' ? JSON.parse(result) : result;
      const refundStatus = response.alipay_trade_refund_response?.fund_change === 'YES' 
        ? 'SUCCESS' 
        : 'PROCESSING';

      // 更新支付记录中的退款信息
      await prisma.payment.update({
        where: { orderId: params.outTradeNo },
        data: {
          refundAmount: params.refundAmount,
          refundTime: new Date(),
        },
      });

      return {
        refundNo: refundId,
        outTradeNo: params.outTradeNo,
        refundAmount: params.refundAmount,
        refundStatus,
      };
    } catch (error: any) {
      console.error('Alipay refund failed:', error);
      throw new AppError('退款申请失败', 500, 'ALIPAY_REFUND_FAILED');
    }
  }

}

export const alipayService = new AlipayService();
