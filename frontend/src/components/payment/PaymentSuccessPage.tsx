import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { subscriptionService } from '../../services/subscriptionService';
import { railwayService } from '../../services/railwayService';
import './Payment.css';

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderId = (location.state as any)?.orderId;

  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const [subscription, setSubscription] = useState<any>(null);
  const [instance, setInstance] = useState<any>(null);

  useEffect(() => {
    if (!orderId) {
      navigate('/dashboard');
      return;
    }

    checkPaymentStatus();
  }, [orderId, navigate]);

  const checkPaymentStatus = async () => {
    try {
      const status = await paymentService.checkPaymentStatus(orderId!);

      if (status.status === 'success' || status.tradeStatus === 'success') {
        setPaymentStatus('success');

        // 获取订阅和实例信息
        try {
          const sub = await subscriptionService.getCurrentSubscription();
          setSubscription(sub);

          if (sub) {
            const instances = await railwayService.getInstances();
            const latestInstance = instances[0];
            setInstance(latestInstance);
          }
        } catch (err) {
          console.error('Failed to fetch subscription/instance info:', err);
        }
      } else {
        setPaymentStatus('failed');
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
      setPaymentStatus('failed');
    }
  };

  const handleViewDashboard = () => {
    navigate('/dashboard');
  };

  const handleViewInstance = () => {
    if (instance?.publicUrl) {
      window.open(instance.publicUrl, '_blank');
    }
  };

  if (paymentStatus === 'checking') {
    return (
      <div className="payment-result-page">
        <div className="result-container" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="loading-spinner" style={{ fontSize: '48px', marginBottom: '24px' }}>
            ⏳
          </div>
          <h2>Verifying Payment...</h2>
          <p style={{ color: '#666', marginTop: '16px' }}>
            Please wait while we verify your payment status.
          </p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="payment-result-page">
        <div className="result-container" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="error-icon" style={{ fontSize: '64px', marginBottom: '24px' }}>
            ❌
          </div>
          <h2 style={{ color: '#c62828' }}>Payment Failed</h2>
          <p style={{ color: '#666', marginTop: '16px', maxWidth: '500px', margin: '0 auto 32px auto' }}>
            We couldn't verify your payment. This could be due to a payment failure or timeout.
            Please try again or contact support if the problem persists.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/payment', { state: { subscriptionId: subscription?.id, plan: subscription?.planType } })}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: '#1976d2',
                border: '1px solid #1976d2',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-result-page">
      <div className="result-container" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div className="success-icon" style={{ fontSize: '64px', marginBottom: '24px' }}>
          ✅
        </div>
        <h2 style={{ color: '#2e7d32' }}>Payment Successful!</h2>
        <p style={{ color: '#666', marginTop: '16px', maxWidth: '600px', margin: '0 auto 32px auto' }}>
          Your payment has been processed successfully. Your subscription is now active and your
          OpenClaw instance is being deployed.
        </p>

        {subscription && (
          <div
            className="subscription-info"
            style={{
              backgroundColor: '#f9f9f9',
              padding: '24px',
              borderRadius: '8px',
              marginBottom: '32px',
              textAlign: 'left',
            }}
          >
            <h3 style={{ marginBottom: '16px' }}>Subscription Details</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Plan:</span>
                <span style={{ fontWeight: 600 }}>{subscription.planType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status:</span>
                <span style={{ fontWeight: 600, color: '#2e7d32' }}>ACTIVE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Start Date:</span>
                <span style={{ fontWeight: 600 }}>
                  {new Date(subscription.startDate).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Renewal Date:</span>
                <span style={{ fontWeight: 600 }}>
                  {new Date(subscription.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {instance && (
          <div
            className="instance-info"
            style={{
              backgroundColor: '#f0f9ff',
              padding: '24px',
              borderRadius: '8px',
              marginBottom: '32px',
              textAlign: 'left',
            }}
          >
            <h3 style={{ marginBottom: '16px' }}>Your Instance</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status:</span>
                <span style={{ fontWeight: 600, color: '#1976d2' }}>
                  {instance.deploymentStatus || 'DEPLOYING'}
                </span>
              </div>
              {instance.publicUrl && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>URL:</span>
                  <a
                    href={instance.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1976d2', fontWeight: 600, textDecoration: 'none' }}
                  >
                    {instance.publicUrl}
                  </a>
                </div>
              )}
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '12px' }}>
              {instance.deploymentStatus === 'RUNNING'
                ? '✅ Your instance is ready! Click the URL above to access it.'
                : '⏳ Your instance is being deployed. This usually takes 2-5 minutes.'}
            </p>
          </div>
        )}

        <div className="next-steps" style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>What's Next?</h3>
          <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            <li style={{ marginBottom: '8px' }}>✅ Your subscription is now active</li>
            <li style={{ marginBottom: '8px' }}>
              🚀 Your OpenClaw instance is being deployed to Railway
            </li>
            <li style={{ marginBottom: '8px' }}>
              📧 You will receive an email with your instance details once deployment is complete
            </li>
            <li style={{ marginBottom: '8px' }}>
              ⚙️ Configure your channels in the dashboard
            </li>
            <li style={{ marginBottom: '8px' }}>
              📊 Monitor your instance usage and performance
            </li>
          </ul>
        </div>

        <div className="action-buttons" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={handleViewDashboard}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Go to Dashboard
          </button>
          {instance?.publicUrl && (
            <button
              onClick={handleViewInstance}
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: '#1976d2',
                border: '1px solid #1976d2',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Open Instance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}