import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import './Payment.css';

export function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscriptionId');
  const plan = searchParams.get('plan') as 'BASIC' | 'PRO' | 'ENTERPRISE';

  const [paymentMethod, setPaymentMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subscriptionId || !plan) {
      navigate('/subscribe');
    }
  }, [subscriptionId, plan, navigate]);

  const handleCreatePayment = async () => {
    if (!subscriptionId || !plan) return;

    try {
      setLoading(true);
      setError(null);

      const amount = plan === 'BASIC' ? 39 : plan === 'PRO' ? 99 : 199;

      const result = await paymentService.createPayment({
        subscriptionId,
        planId: plan,
        amount: amount * 100, // Convert to cents
        method: paymentMethod,
        tradeType: 'pc',
      });

      // 如果是支付宝，直接跳转
      if (paymentMethod === 'alipay' && result.paymentUrl) {
        // 自动跳转到支付页面
        window.location.href = result.paymentUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create payment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  if (!subscriptionId || !plan) {
    return null;
  }

  return (
    <div className="payment-page">
      <div className="payment-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
        <header style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Complete Your Payment</h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Choose your payment method to complete the subscription
          </p>
        </header>

        {/* Order Summary */}
        <div
          className="order-summary"
          style={{
            padding: '24px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            marginBottom: '32px',
          }}
        >
          <h3 style={{ marginBottom: '16px' }}>Order Summary</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Plan:</span>
              <span style={{ fontWeight: 600 }}>{plan}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Amount:</span>
              <span style={{ fontWeight: 600, fontSize: '18px' }}>
                ¥{plan === 'BASIC' ? 39 : plan === 'PRO' ? 99 : 199}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subscription:</span>
              <span style={{ fontWeight: 600 }}>Monthly</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="payment-method-section" style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>Select Payment Method</h3>
          <div className="payment-methods" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              className={`payment-method ${paymentMethod === 'alipay' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('alipay')}
              style={{
                padding: '16px',
                border: `2px solid ${paymentMethod === 'alipay' ? '#1677ff' : '#e0e0e0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: paymentMethod === 'alipay' ? '#f0f8ff' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'alipay'}
                onChange={() => setPaymentMethod('alipay')}
              />
              <div style={{ fontSize: '18px', fontWeight: 600 }}>Alipay (支付宝)</div>
            </div>

            <div
              className={`payment-method ${paymentMethod === 'wechat' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('wechat')}
              style={{
                padding: '16px',
                border: `2px solid ${paymentMethod === 'wechat' ? '#07c160' : '#e0e0e0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: paymentMethod === 'wechat' ? '#f0fff4' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'wechat'}
                onChange={() => setPaymentMethod('wechat')}
              />
              <div style={{ fontSize: '18px', fontWeight: 600 }}>WeChat Pay (微信支付)</div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div
            className="error-message"
            style={{
              padding: '12px',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/subscribe')}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            Back
          </button>

          <button
            onClick={handleCreatePayment}
            disabled={loading}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 600,
              backgroundColor: paymentMethod === 'alipay' ? '#1677ff' : '#07c160',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Processing...' : `Pay with ${paymentMethod === 'alipay' ? 'Alipay' : 'WeChat'}`}
          </button>
        </div>

        {/* Security Notice */}
        <div
          className="security-notice"
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #b3e0ff',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', color: '#0050b3' }}>🔒 Secure Payment</h4>
          <p style={{ margin: 0, fontSize: '14px', color: '#0050b3' }}>
            Your payment is processed securely through {paymentMethod === 'alipay' ? 'Alipay' : 'WeChat Pay'}.
            We never store your payment credentials.
          </p>
        </div>
      </div>
    </div>
  );
}