import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../utils/errors';
import { prisma } from '../../database/prisma';

/**
 * 支付宝服务
 * 生产环境需要集成 alipay-sdk，这里提供完整的业务逻辑结构
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
  constructor() {
    // Initialize with environment variables
    const appId = process.env.ALIPAY_APP_ID || '';
    const privateKey = process.env.ALIPAY_PRIVATE_KEY || '';
    const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY || '';
    
    // Use these variables in methods
    if (!appId || !privateKey || !alipayPublicKey) {
      console.warn('⚠️ Alipay credentials not configured');
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
      });    // 根据支付方式返回不同的支付 URL
    let paymentUrl: string;
    switch (params.paymentMethod) {
      case 'pc':
        paymentUrl = this.createPCPaymentUrl(outTradeNo, params);
        break;
      case 'h5':
        paymentUrl = this.createH5PaymentUrl(outTradeNo, params);
        break;
      case 'jsapi':
        paymentUrl = this.createJsapiPaymentUrl(outTradeNo, params);
        break;
      default:
        throw new AppError(`不支持的支付方式: ${params.paymentMethod}`, 400, 'INVALID_PAYMENT_METHOD');
    }

    return {
      paymentId,
      outTradeNo,
      amount: params.totalAmount,
      subject: params.subject,
      paymentUrl,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 创建 PC 支付 URL
   */
  private createPCPaymentUrl(outTradeNo: string, params: CreatePaymentParams): string {
    const query = new URLSearchParams({
      outTradeNo,
      amount: params.totalAmount.toFixed(2),
      subject: params.subject,
      returnUrl: params.returnUrl || '',
    });
    return `https://payment-simulator.example.com/alipay/pc?${query.toString()}`;
  }

  /**
   * 创建 H5 支付 URL
   */
  private createH5PaymentUrl(outTradeNo: string, params: CreatePaymentParams): string {
    const query = new URLSearchParams({
      outTradeNo,
      amount: params.totalAmount.toFixed(2),
      subject: params.subject,
    });
    return `https://payment-simulator.example.com/alipay/h5?${query.toString()}`;
  }

  /**
   * 创建 JSAPI 支付 URL
   */
  private createJsapiPaymentUrl(outTradeNo: string, params: CreatePaymentParams): string {
    const query = new URLSearchParams({
      outTradeNo,
      amount: params.totalAmount.toFixed(2),
      subject: params.subject,
    });
    return `https://payment-simulator.example.com/alipay/jsapi?${query.toString()}`;
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
        tradeStatus: payment.status,
        totalAmount: payment.amount,
      };
    } catch (error) {
        throw new AppError('查询支付状态失败', 500, 'ALIPAY_QUERY_FAILED');
    }
  }

  /**
   * 处理支付回调
   */
  async handleNotify(data: any): Promise<boolean> {
    try {
      const { out_trade_no, trade_status } = data;

      // 更新支付状态
      await prisma.payment.update({
        where: { orderId: out_trade_no },
        data: {
          status: trade_status === 'TRADE_SUCCESS' ? 'SUCCESS' : 'FAILED',
        },
      });

      return true;
    } catch (error) {
        throw new AppError('处理支付回调失败', 500, 'ALIPAY_NOTIFY_FAILED');
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
        refundNo: refundId,
        outTradeNo: params.outTradeNo,
        refundAmount: params.refundAmount,
        refundStatus: 'pending',
      };
    } catch (error) {
        throw new AppError('退款申请失败', 500, 'ALIPAY_REFUND_FAILED');
    }
  }
}

export const alipayService = new AlipayService();
