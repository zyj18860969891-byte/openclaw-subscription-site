import { useNavigate } from 'react-router-dom';
import type { SubscriptionPlan } from '../../types';

interface PricingCardProps {
  plan: SubscriptionPlan;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
}

export function PricingCard({
  plan,
  price,
  period,
  features,
  popular = false,
  onSelect,
}: PricingCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login?redirect=/subscribe');
      return;
    }
    onSelect(plan);
  };

  return (
    <div
      className={`pricing-card ${popular ? 'popular' : ''}`}
      onClick={handleClick}
      style={{
        border: popular ? '2px solid #1976d2' : '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        backgroundColor: popular ? '#f5f9ff' : 'white',
      }}
    >
      {popular && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1976d2',
            color: 'white',
            padding: '4px 16px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          MOST POPULAR
        </div>
      )}

      <h3 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600 }}>
        {plan}
      </h3>

      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#333' }}>
          ¥{price}
        </span>
        <span style={{ fontSize: '16px', color: '#666' }}>/{period}</span>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
        {features.map((feature, index) => (
          <li
            key={index}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid #f0f0f0',
              color: '#555',
            }}
          >
            ✓ {feature}
          </li>
        ))}
      </ul>

      <button
        className={`select-plan-btn ${popular ? 'popular' : ''}`}
        style={{
          width: '100%',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 600,
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: popular ? '#1976d2' : '#fff',
          color: popular ? 'white' : '#1976d2',
          transition: 'background-color 0.2s',
        }}
      >
        Choose Plan
      </button>
    </div>
  );
}