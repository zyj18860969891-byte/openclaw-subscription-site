import { apiClient } from './apiClient';

export interface CreatePaymentRequest {
  subscriptionId: string;
  planId: string;
  amount: number;
  method: 'alipay' | 'wechat';
  tradeType: string;
}

export interface PaymentResult {
  outTradeNo: string;
  paymentUrl?: string;
  qrCode?: string;
}

export interface PaymentStatus {
  status: string;
  tradeStatus: string;
  orderId: string;
  amount: number;
  paidAmount?: number;
  payTime?: string;
}

export const paymentService = {
  /**
   * 创建支付订单
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    const response = await apiClient.post('/payments/create', request);
    return response.data.data;
  },

  /**
   * 查询支付状态
   */
  async checkPaymentStatus(orderId: string): Promise<PaymentStatus> {
    const response = await apiClient.get(`/payments/status/${orderId}`);
    return response.data.data;
  },

  /**
   * 处理支付回调（用于后端webhook）
   */
  async handlePaymentCallback(callbackData: any): Promise<any> {
    const response = await apiClient.post('/payments/callback', callbackData);
    return response.data;
  },

  /**
   * 获取支付方式配置
   */
  async getPaymentMethods(): Promise<Array<{ method: string; name: string; enabled: boolean }>> {
    const response = await apiClient.get('/payments/methods');
    return response.data.data;
  },
};