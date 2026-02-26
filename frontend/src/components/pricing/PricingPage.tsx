import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PricingCard } from './PricingCard';
import type { SubscriptionPlan, SubscriptionPlanDetails } from '../../types';
import { subscriptionService } from '../../services/subscriptionService';
import './Pricing.css';

export function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlanDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getPlans();
      setPlans(data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load pricing plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    navigate(`/subscribe?plan=${plan.toLowerCase()}`);
  };



  if (loading) {
    return (
      <div className="pricing-page" style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading pricing plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pricing-page" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: 'red' }}>{error}</div>
        <button onClick={fetchPlans} style={{ marginTop: '16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <header style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px' }}>
          Choose Your Plan
        </h1>
        <p style={{ fontSize: '18px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
          Select the perfect plan for your needs. All plans include our core features
          with different limits and support levels.
        </p>
      </header>

      <div
        className="pricing-cards-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {plans.map((plan) => (
          <PricingCard
            key={plan.planType}
            plan={plan.planType}
            price={plan.priceAmount}
            period="month"
            features={plan.features.map((feature) => feature.name)}
            popular={plan.planType === 'PRO'}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      <div
        className="pricing-footer"
        style={{
          textAlign: 'center',
          marginTop: '64px',
          padding: '32px',
          backgroundColor: '#f9f9f9',
          borderRadius: '12px',
        }}
      >
        <h3 style={{ marginBottom: '16px' }}>All Plans Include</h3>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <li>✓ 24/7 Monitoring</li>
          <li>✓ SSL Certificate</li>
          <li>✓ Automatic Backups</li>
          <li>✓ DDoS Protection</li>
          <li>✓ 99.9% Uptime SLA</li>
          <li>✓ Global CDN</li>
        </ul>
      </div>
    </div>
  );
}