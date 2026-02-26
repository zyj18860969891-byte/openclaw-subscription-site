import { useNavigate } from 'react-router-dom';
import './Payment.css';

export function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="payment-result-page">
      <div className="result-container" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div className="cancel-icon" style={{ fontSize: '64px', marginBottom: '24px' }}>
          ⚠️
        </div>
        <h2 style={{ color: '#f57c00' }}>Payment Cancelled</h2>
        <p style={{ color: '#666', marginTop: '16px', maxWidth: '500px', margin: '0 auto 32px auto' }}>
          You have cancelled the payment. Your subscription has not been activated.
          You can try again anytime.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/payment')}
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