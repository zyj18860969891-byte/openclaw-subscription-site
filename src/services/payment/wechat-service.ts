import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../utils/errors';
import { prisma } from '../../database/prisma';

/**
 * 微信支付服务
 * 生产环境需要集成 wechatpay-node-sdk，这里提供完整的业务逻辑结构
 */

export interface CreatePaymentParams {
  userId: string;
  subscriptionId?: string;
  planId?: string;
  outTradeNo?: string;
  description: string;
  totalAmount: number;
  tradeType: 'H5' | 'JSAPI' | 'APP';
  notifyUrl?: string;
  clientIp?: string;
  openId?: string;
}

export interface RefundParams {
  outTradeNo: string;
  refundAmount: number;
  refundReason: string;
}

export interface QueryResult {
  transactionId?: string;
  outTradeNo: string;
  tradeState: string;
  amount?: number;
}

export interface RefundResult {
  refundId: string;
  status: string;
}

export interface PaymentResponse {
  paymentId: string;
  outTradeNo: string;
  amount: number;
  description: string;
  paymentUrl?: string;
  qrCode?: string;
  status: string;
  createdAt: string;
}

export class WechatService {
  constructor() {
    // Initialize with environment variables
    const appId = process.env.WECHAT_APP_ID || '';
    const mchId = process.env.WECHAT_MCH_ID || '';
    const apiKey = process.env.WECHAT_API_KEY || '';
    
    // Use these variables in methods
    if (!appId || !mchId || !apiKey) {
      console.warn('⚠️ WeChat credentials not configured');
    }
  }

  /**
   * 创建支付订单（统一入口）
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    const outTradeNo = params.outTradeNo || `WX_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const paymentId = uuidv4();

      // 记录支付到数据库
      await prisma.payment.create({
        data: {
          id: paymentId,
          userId: params.userId,
          subscriptionId: params.subscriptionId,
          amount: params.totalAmount,
          paymentMethod: 'WECHAT',
          status: 'PENDING',
          orderId: outTradeNo,
        },
      });    // 根据支付方式返回不同的支付 URL
    let paymentUrl: string;
    switch (params.tradeType) {
      case 'H5':
        paymentUrl = this.createH5PaymentUrl(outTradeNo, params);
        break;
      case 'JSAPI':
        paymentUrl = this.createJsapiPaymentUrl(outTradeNo, params);
        break;
      case 'APP':
        paymentUrl = this.createAppPaymentUrl(outTradeNo, params);
        break;
      default:
        throw new AppError(`不支持的支付方式: ${params.tradeType}`, 400, 'INVALID_PAYMENT_METHOD');
    }

    return {
      paymentId,
      outTradeNo,
      amount: params.totalAmount,
      description: params.description,
      paymentUrl,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 创建 H5 支付 URL
   */
  private createH5PaymentUrl(outTradeNo: string, params: CreatePaymentParams): string {
    const query = new URLSearchParams({
      outTradeNo,
      amount: params.totalAmount.toFixed(2),
      desc: params.description,
      type: 'H5',
    });
    return `https://payment-simulator.example.com/wechat/h5?${query.toString()}`;
  }

  /**
   * 创建 JSAPI 支付 URL（公众号/小程序）
   */
  private createJsapiPaymentUrl(outTradeNo: string, params: CreatePaymentParams): string {
    if (!params.openId) {
        throw new AppError('JSAPI 支付需要 openId', 400, 'MISSING_OPENID');
    }

    const query = new URLSearchParams({
      outTradeNo,
      amount: params.totalAmount.toFixed(2),
      desc: params.description,
      openId: params.openId,
    });
    return `https://payment-simulator.example.com/wechat/jsapi?${query.toString()}`;
  }

  /**
   * 创建 APP 支付 URL
   */
  private createAppPaymentUrl(outTradeNo: string, params: CreatePaymentParams): string {
    const query = new URLSearchParams({
      outTradeNo,
      amount: params.totalAmount.toFixed(2),
      desc: params.description,
    });
    return `https://payment-simulator.example.com/wechat/app?${query.toString()}`;
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(outTradeNo: string): Promise<QueryResult> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { orderId: outTradeNo },
      });

      if (!payment) {
        throw new AppError('支付记录不存在', 404, 'PAYMENT_NOT_FOUND');
      }

      return {
        outTradeNo,
        tradeState: payment.status,
        amount: payment.amount,
      };
    } catch (error) {
        throw new AppError('查询支付状态失败', 500, 'WECHAT_QUERY_FAILED');
    }
  }

  /**
   * 处理支付回调
   */
  async handleNotify(data: any): Promise<boolean> {
    try {
      const { out_trade_no, trade_state } = data;

      // 更新支付状态
      await prisma.payment.update({
        where: { orderId: out_trade_no },
        data: {
          status: trade_state === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        },
      });

      return true;
    } catch (error) {
        throw new AppError('处理支付回调失败', 500, 'WECHAT_NOTIFY_FAILED');
    }
  }

  /**
   * 申请退款
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const refundId = `REFUND_${Date.now()}_${uuidv4().slice(0, 8)}`;

      // 更新支付记录中的退款信息
      await prisma.payment.update({
        where: { orderId: params.outTradeNo },
        data: {
          refundAmount: params.refundAmount,
          refundTime: new Date(),
        },
      });

      return {
        refundId: refundId,
        status: 'pending',
      };
    } catch (error) {
        throw new AppError('退款申请失败', 500, 'WECHAT_REFUND_FAILED');
    }
  }
}

export const wechatService = new WechatService();
