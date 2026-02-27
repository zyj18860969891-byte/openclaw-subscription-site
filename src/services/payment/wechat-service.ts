import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import crypto from 'crypto';
import { AppError } from '../../utils/errors';
import { prisma } from '../../database/prisma';

/**
 * 微信支付服务
 * 手动实现微信支付 API v3 调用
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
  private appId: string;
  private mchId: string;
  private privateKey: string;
  private serialNo: string;
  private apiV3Key: string;
  private notifyUrl: string;
  private platformCert: string; // 微信支付平台证书（用于验证回调签名）

  constructor() {
    // 初始化配置
    this.appId = process.env.WECHAT_APP_ID || '';
    this.mchId = process.env.WECHAT_MCH_ID || '';
    this.privateKey = process.env.WECHAT_PRIVATE_KEY || '';
    this.serialNo = process.env.WECHAT_SERIAL_NO || '';
    this.apiV3Key = process.env.WECHAT_APIV3_KEY || '';
    this.notifyUrl = process.env.WECHAT_NOTIFY_URL || '';
    this.platformCert = process.env.WECHAT_PLATFORM_CERT || '';

    // 验证必需配置
    if (!this.appId || !this.mchId || !this.privateKey || !this.serialNo || !this.apiV3Key) {
      console.warn('⚠️ WeChat Pay credentials not fully configured');
    }

    // 验证平台证书（用于回调签名验证）
    if (!this.platformCert) {
      console.warn('⚠️ WeChat Platform Certificate not configured - callback signature verification disabled');
    }
  }

  /**
   * 生成签名
   */
  private generateSignature(method: string, url: string, body: string, timestamp: string, nonce: string): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(this.privateKey, 'base64');
  }

  /**
   * 创建支付订单（统一入口）
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    const outTradeNo = params.outTradeNo || `WX_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const paymentId = uuidv4();

    try {
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
      });

      // 构建支付参数
      const paymentParams: any = {
        description: params.description,
        outTradeNo,
        amount: {
          total: params.totalAmount,
          currency: 'CNY',
        },
        notifyUrl: params.notifyUrl || this.notifyUrl,
      };

      // 根据支付方式添加特定参数
      if (params.tradeType === 'H5') {
        paymentParams.sceneInfo = {
          h5_info: {
            type: 'Wap',
            wapUrl: process.env.APP_URL || 'https://your-domain.com',
            wapName: 'OpenClaw Subscription',
          },
        };
      } else if (params.tradeType === 'JSAPI') {
        if (!params.openId) {
          throw new AppError('JSAPI 支付需要 openId', 400, 'MISSING_OPENID');
        }
        paymentParams.payer = {
          openid: params.openId,
        };
      }

      // 调用微信支付 API
      const result = await this.callWechatApi('/v3/pay/transactions/native', paymentParams);

      return {
        paymentId,
        outTradeNo,
        amount: params.totalAmount,
        description: params.description,
        qrCode: result.code_url,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('WeChat payment creation failed:', error);
      throw new AppError('创建微信支付失败', 500, 'WECHAT_CREATE_FAILED');
    }
  }

  /**
   * 调用微信支付 API
   */
  private async callWechatApi(endpoint: string, data: any): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const body = JSON.stringify(data);

    const signature = this.generateSignature('POST', endpoint, body, timestamp, nonce);

    const headers = {
      'Authorization': `WECHATPAY2-SHA256-RSA2048 ${this.appId}:${timestamp}:${nonce}:${signature}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Wechatpay-Serial': this.serialNo,
    };

    const response = await axios.post(`https://api.mch.weixin.qq.com${endpoint}`, data, { headers });
    return response.data;
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

      // 查询微信支付状态
      const result = await this.callWechatApi(`/v3/pay/transactions/out-trade-no/${outTradeNo}`, {});

      return {
        outTradeNo,
        tradeState: result.trade_state,
        amount: payment.amount,
        transactionId: result.transaction_id,
      };
    } catch (error: any) {
      if (error.code === 'ORDERNOTEXIST' || error.message?.includes('ORDERNOTEXIST')) {
        throw new AppError('支付记录不存在', 404, 'PAYMENT_NOT_FOUND');
      }
      console.error('WeChat payment query failed:', error);
      throw new AppError('查询支付状态失败', 500, 'WECHAT_QUERY_FAILED');
    }
  }

  /**
   * 处理支付回调（需要验证签名）
   */
  async handleNotify(body: any, headers: any): Promise<boolean> {
    try {
      // 验证微信支付回调签名
      const signature = headers['wechatpay-signature'];
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];

      if (!signature || !timestamp || !nonce) {
        throw new AppError('微信支付回调缺少签名头', 400, 'WECHAT_MISSING_HEADERS');
      }

      // 验证签名（使用平台证书）
      if (this.platformCert) {
        const verified = this.verifySignature(
          signature,
          timestamp,
          nonce,
          JSON.stringify(body)
        );

        if (!verified) {
          throw new AppError('微信支付回调签名验证失败', 400, 'WECHAT_SIGNATURE_INVALID');
        }
        console.log('✅ WeChat callback signature verified successfully');
      } else {
        console.warn('⚠️ WeChat Platform Certificate not configured - skipping signature verification');
      }

      const { out_trade_no, trade_state } = body;

      // 更新支付状态
      await prisma.payment.update({
        where: { orderId: out_trade_no },
        data: {
          status: trade_state === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          wechatTransactionId: body.transaction_id,
          paymentTime: body.success_time ? new Date(body.success_time) : undefined,
        },
      });

      // 如果支付成功，触发自动部署
      if (trade_state === 'SUCCESS') {
        try {
          console.log(`WeChat payment successful for order: ${out_trade_no}, triggering deployment...`);
          // TODO: 实现从订单号查找订阅ID的逻辑
          // const subscriptionId = await findSubscriptionByOrderId(out_trade_no);
          // if (subscriptionId) {
          //   await deploymentService.deployNewInstance(subscriptionId);
          // }
        } catch (deployError) {
          console.error('Failed to trigger deployment after wechat payment:', deployError);
        }
      }

      return true;
    } catch (error: any) {
      console.error('WeChat notify handling failed:', error);
      throw new AppError('处理微信支付回调失败', 500, 'WECHAT_NOTIFY_FAILED');
    }
  }

  /**
   * 验证微信支付回调签名
   */
  private verifySignature(signature: string, timestamp: string, nonce: string, body: string): boolean {
    try {
      // 构建验证消息
      const message = `${timestamp}\n${nonce}\n${body}\n`;
      
      // 使用平台证书验证签名
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(message);
      
      // 验证签名
      const isValid = verify.verify(this.platformCert, signature, 'base64');
      
      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * 申请退款
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const refundId = `REFUND_${Date.now()}_${uuidv4().slice(0, 8)}`;

      // 调用微信支付退款 API
      const refundParams = {
        outTradeNo: params.outTradeNo,
        outRefundNo: refundId,
        amount: {
          total: params.refundAmount,
          currency: 'CNY',
        },
        reason: params.refundReason,
      };

      await this.callWechatApi('/v3/refund/domestic/refunds', refundParams);

      // 更新支付记录中的退款信息
      await prisma.payment.update({
        where: { orderId: params.outTradeNo },
        data: {
          refundAmount: params.refundAmount,
          refundTime: new Date(),
        },
      });

      return {
        refundId,
        status: 'processing',
      };
    } catch (error: any) {
      console.error('WeChat refund failed:', error);
      throw new AppError('退款申请失败', 500, 'WECHAT_REFUND_FAILED');
    }
  }
}

export const wechatService = new WechatService();
