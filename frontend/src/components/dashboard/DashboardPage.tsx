import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionService } from '../../services/subscriptionService';
import { railwayService } from '../../services/railwayService';
import './Dashboard.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'instances'>('overview');
  const [subscription, setSubscription] = useState<any>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 延迟加载数据，避免阻塞页面渲染
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 并行请求两个API，增加超时时间到30秒
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });
      
      // 使用Promise.all并行执行，并设置超时
      const [sub, inst] = await Promise.all([
        Promise.race([subscriptionService.getCurrentSubscription(), timeoutPromise]),
        Promise.race([railwayService.getInstances(), timeoutPromise]),
      ]);
      
      setSubscription(sub);
      setInstances(inst);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      
      // 根据错误类型设置不同的错误消息
      if (err.message === 'Request timeout') {
        setError('Data is loading slowly. Please wait a moment or refresh the page.');
      } else if (err.response?.status === 404) {
        setError('Some services are temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to load dashboard data. Some features may be limited.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstance = async () => {
    try {
      const result = await railwayService.createInstance();
      if (result.success) {
        // 刷新实例列表
        fetchData();
        // 显示成功消息
        alert('Instance creation started! Check the instances tab for status.');
      } else {
        alert(`Failed to create instance: ${result.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.message || 'Failed to create instance'}`);
    }
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (!window.confirm('Are you sure you want to delete this instance?')) {
      return;
    }

    try {
      await railwayService.deleteInstance(instanceId);
      fetchData();
    } catch (err: any) {
      alert(`Failed to delete instance: ${err.response?.data?.message || 'Unknown error'}`);
    }
  };

  const handleRedeployInstance = async (instanceId: string) => {
    try {
      await railwayService.redeployInstance(instanceId);
      fetchData();
      alert('Redeployment triggered!');
    } catch (err: any) {
      alert(`Failed to redeploy: ${err.response?.data?.message || 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'RUNNING':
        return '#2e7d32';
      case 'INITIALIZING':
      case 'DEPLOYING':
        return '#f57c00';
      case 'FAILED':
      case 'CRASHED':
        return '#c62828';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page" style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: 'red' }}>{error}</div>
        <button onClick={fetchData} style={{ marginTop: '16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Manage your subscription and instances
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation" style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid #e0e0e0', paddingBottom: '16px' }}>
        {(['overview', 'subscription', 'instances'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === tab ? '#1976d2' : 'transparent',
              color: activeTab === tab ? 'white' : '#666',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="overview-tab">
          <div
            className="stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            <div className="stat-card" style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>Current Plan</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                {subscription?.planType || 'No active subscription'}
              </p>
            </div>

            <div className="stat-card" style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>Active Instances</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                {instances.filter((i) => i.status === 'RUNNING').length} / {subscription?.planType === 'BASIC' ? 1 : subscription?.planType === 'PRO' ? 5 : '∞'}
              </p>
            </div>

            <div className="stat-card" style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>Subscription Status</h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: subscription?.status === 'ACTIVE' ? '#2e7d32' : '#c62828' }}>
                {subscription?.status || 'Inactive'}
              </p>
            </div>

            <div className="stat-card" style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>Next Renewal</h3>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                {subscription?.endDate
                  ? new Date(subscription.endDate).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions" style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Quick Actions</h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/subscribe')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Modify Subscription
              </button>
              <button
                onClick={handleCreateInstance}
                disabled={!subscription || subscription.status !== 'ACTIVE'}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: subscription?.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
                  opacity: subscription?.status === 'ACTIVE' ? 1 : 0.6,
                }}
              >
                Create New Instance
              </button>
              <button
                onClick={() => setActiveTab('instances')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#1976d2',
                  border: '1px solid #1976d2',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                View Instances
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="subscription-tab">
          <div className="subscription-details" style={{ maxWidth: '800px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Subscription Details</h2>

            {subscription ? (
              <div
                className="subscription-card"
                style={{
                  padding: '24px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Plan:</span>
                    <span>{subscription.planType}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Status:</span>
                    <span style={{ color: subscription.status === 'ACTIVE' ? '#2e7d32' : '#c62828' }}>
                      {subscription.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Start Date:</span>
                    <span>{new Date(subscription.startDate).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Renewal Date:</span>
                    <span>{new Date(subscription.endDate).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Auto-Renew:</span>
                    <span>{subscription.isAutoRenew ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e0e0e0' }}>
                  <h3 style={{ marginBottom: '16px' }}>Plan Limits</h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Max Instances:</span>
                      <span>
                        {subscription.planType === 'BASIC'
                          ? '1'
                          : subscription.planType === 'PRO'
                          ? '5'
                          : 'Unlimited'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Current Instances:</span>
                      <span>{instances.filter((i) => i.status !== 'DELETED').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="no-subscription"
                style={{
                  padding: '48px',
                  textAlign: 'center',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                }}
              >
                <h3 style={{ marginBottom: '16px' }}>No Active Subscription</h3>
                <p style={{ marginBottom: '24px', color: '#666' }}>
                  You don't have an active subscription. Subscribe to start using OpenClaw.
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  View Pricing
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instances Tab */}
      {activeTab === 'instances' && (
        <div className="instances-tab">
          <div className="instances-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', margin: 0 }}>Your Instances</h2>
            <button
              onClick={handleCreateInstance}
              disabled={!subscription || subscription.status !== 'ACTIVE'}
              style={{
                padding: '10px 20px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: subscription?.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
                opacity: subscription?.status === 'ACTIVE' ? 1 : 0.6,
              }}
            >
              + Create Instance
            </button>
          </div>

          {instances.length === 0 ? (
            <div
              className="no-instances"
              style={{
                padding: '48px',
                textAlign: 'center',
                border: '2px dashed #ddd',
                borderRadius: '8px',
              }}
            >
              <h3 style={{ marginBottom: '16px' }}>No Instances Yet</h3>
              <p style={{ marginBottom: '24px', color: '#666' }}>
                Create your first OpenClaw instance to get started.
              </p>
              <button
                onClick={handleCreateInstance}
                disabled={!subscription || subscription.status !== 'ACTIVE'}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: subscription?.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
                  opacity: subscription?.status === 'ACTIVE' ? 1 : 0.6,
                }}
              >
                Create Instance
              </button>
            </div>
          ) : (
            <div className="instances-grid" style={{ display: 'grid', gap: '16px' }}>
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  className="instance-card"
                  style={{
                    padding: '20px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 8px 0' }}>{instance.projectName}</h3>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: getStatusColor(instance.status) + '20',
                          color: getStatusColor(instance.status),
                        }}
                      >
                        {instance.status}
                      </span>
                      {instance.publicUrl && (
                        <a
                          href={instance.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#1976d2', textDecoration: 'none' }}
                        >
                          {instance.publicUrl}
                        </a>
                      )}
                      <span style={{ color: '#666', fontSize: '14px' }}>
                        Created: {new Date(instance.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="instance-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleRedeployInstance(instance.id)}
                      disabled={instance.status === 'FAILED'}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: instance.status === 'FAILED' ? '#ccc' : '#f57c00',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: instance.status === 'FAILED' ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Redeploy
                    </button>
                    <button
                      onClick={() => handleDeleteInstance(instance.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#c62828',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}