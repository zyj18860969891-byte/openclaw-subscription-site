import { Router, Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { paymentGatewayInstance as paymentGateway } from '../services/payment/payment-gateway';
import { AppError, ValidationError } from '../utils/errors';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

/**
 * 创建支付订单
 * POST /api/payment/create
 */
router.post(
  '/create',
  authMiddleware,
  [
    body('subscriptionId').isString().notEmpty().withMessage('订阅ID不能为空'),
    body('plan').isIn(['BASIC', 'PRO', 'ENTERPRISE']).withMessage('无效的计划类型'),
    body('method').isIn(['alipay', 'wechat']).withMessage('无效的支付方式'),
    body('amount').isFloat({ min: 0.01 }).withMessage('金额必须大于0'),
    body('tradeType').optional().isIn(['pc', 'h5', 'jsapi', 'app']).withMessage('无效的交易类型'),
    body('openId').if(() => false).optional().isString(), // JSAPI支付时需要
  ],
  async (req: Request, res: Response) => {
    try {
      // 验证参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('参数验证失败');
      }

      const { subscriptionId, planId, method, amount, tradeType, openId } = req.body;
      const userId = (req as any).user.id;

      // 创建支付订单
      const result = await paymentGateway.createPayment({
        userId,
        subscriptionId,
        planId,
        amount,
        method,
        tradeType,
        openId,
      });

      return res.json(
        successResponse(
          {
            outTradeNo: result.outTradeNo,
            method: result.method,
            paymentUrl: result.paymentUrl,
          },
          '订单创建成功'
        )
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json(errorResponse(error.message, error.code));
      }
      console.error('创建支付订单失败:', error);
      return res.status(500).json(errorResponse('创建支付订单失败', 'INTERNAL_ERROR'));
    }
  }
);

/**
 * 支付宝支付回调
 * POST /api/payment/alipay/notify
 */
router.post('/alipay/notify', async (req: Request, res: Response) => {
  try {
    // 处理支付宝回调
    await paymentGateway.handleNotify('ALIPAY', req.body);
    
    // 如果支付成功，触发自动部署
    const { out_trade_no } = req.body;
    if (req.body.trade_status === 'TRADE_SUCCESS') {
      try {
        // 这里需要根据订单号找到对应的订阅ID
        // 在实际实现中，应该在创建支付订单时保存订单号和订阅ID的映射关系
        console.log(`Payment successful for order: ${out_trade_no}, triggering deployment...`);
        
        // TODO: 实现从订单号查找订阅ID的逻辑
        // const subscriptionId = await findSubscriptionByOrderId(out_trade_no);
        // if (subscriptionId) {
        //   await deploymentService.deployNewInstance(subscriptionId);
        // }
      } catch (deployError) {
        console.error('Failed to trigger deployment after payment:', deployError);
        // 不影响回调处理，只记录错误
      }
    }
    
    return res.json(successResponse({ success: true }, '回调处理成功'));
  } catch (error) {
    console.error('处理支付宝回调失败:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(errorResponse(error.message, error.code));
    }
    return res.status(500).json(errorResponse('处理回调失败', 'INTERNAL_ERROR'));
  }
});

/**
 * 微信支付回调
 * POST /api/payment/wechat/notify
 */
router.post('/wechat/notify', async (req: Request, res: Response) => {
  try {
    // 处理微信回调（传递headers用于签名验证）
    await paymentGateway.handleNotify('WECHAT', req.body, req.headers);
    
    // 微信支付要求返回空XML响应
    res.status(200).send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
  } catch (error) {
    console.error('WeChat notify error:', error);
    // 微信支付要求返回失败XML响应
    res.status(500).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>');
  }
});

/**
 * 查询订单状态
 * GET /api/payment/:method/:outTradeNo
 */
router.get(
  '/:method/:outTradeNo',
  authMiddleware,
  [
    param('method').isIn(['alipay', 'wechat']).withMessage('无效的支付方式'),
    param('outTradeNo').isString().notEmpty().withMessage('订单号不能为空'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('参数验证失败');
      }

      const { method, outTradeNo } = req.params;

      const result = await paymentGateway.queryPaymentStatus(outTradeNo, method as 'ALIPAY' | 'WECHAT');

      return res.json(
        successResponse(result, '查询成功')
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json(errorResponse(error.message, error.code));
      }
      console.error('查询订单失败:', error);
      return res.status(500).json(errorResponse('查询订单失败', 'INTERNAL_ERROR'));
    }
  }
);

/**
 * 申请退款
 * POST /api/payment/refund
 */
router.post(
  '/refund',
  authMiddleware,
  [
    body('method').isIn(['alipay', 'wechat']).withMessage('无效的支付方式'),
    body('outTradeNo').isString().notEmpty().withMessage('订单号不能为空'),
    body('amount').isFloat({ min: 0.01 }).withMessage('金额必须大于0'),
    body('reason').isString().notEmpty().withMessage('退款原因不能为空'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('参数验证失败');
      }

      const { method, outTradeNo, amount, reason } = req.body;
      
      // Use method parameter if needed for different payment gateways
      console.log(`Processing refund using ${method}`);

      const result = await paymentGateway.refund(outTradeNo, amount, reason);

      return res.json(
        successResponse(result, '退款申请成功')
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(errorResponse(error.message, 'VALIDATION_ERROR'));
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json(errorResponse(error.message, error.code));
      }
      console.error('申请退款失败:', error);
      return res.status(500).json(errorResponse('申请退款失败', 'INTERNAL_ERROR'));
    }
  }
);

export default router;
