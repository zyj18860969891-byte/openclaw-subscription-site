import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SubscriptionPlan, ChannelType } from '../../types';
import { subscriptionService } from '../../services/subscriptionService';
import './Subscribe.css';

export function SubscribePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') as SubscriptionPlan | null;

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(planParam || 'BASIC');
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([]);
  const [channelCredentials, setChannelCredentials] = useState<Record<ChannelType, any>>({
    feishu: {},
    dingtalk: {},
    wechat: {},
    telegram: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelLabels: Record<ChannelType, string> = {
    feishu: 'Feishu (飞书)',
    dingtalk: 'DingTalk (钉钉)',
    wechat: 'WeChat (微信)',
    telegram: 'Telegram',
  };

  const channelDescriptions: Record<ChannelType, string> = {
    feishu: 'Integrate with Feishu/Lark for bot interactions',
    dingtalk: 'Connect to DingTalk workspace',
    wechat: 'Enable WeChat integration',
    telegram: 'Add Telegram bot support',
  };

  const handleChannelToggle = (channel: ChannelType) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const handleChannelCredentialChange = (
    channel: ChannelType,
    field: string,
    value: string
  ) => {
    setChannelCredentials((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value,
      },
    }));
  };

  const validateChannelCredentials = (channel: ChannelType): boolean => {
    const creds = channelCredentials[channel];

    switch (channel) {
      case 'feishu':
        return !!creds.appId && !!creds.appSecret && !!creds.webhookToken;
      case 'dingtalk':
        return !!creds.appKey && !!creds.appSecret;
      case 'wechat':
        return !!creds.corpId && !!creds.secret;
      case 'telegram':
        return !!creds.botToken && !!creds.chatId;
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 验证至少选择一个通道
    if (selectedChannels.length === 0) {
      setError('Please select at least one channel');
      return;
    }

    // 验证所有选中通道的凭证
    for (const channel of selectedChannels) {
      if (!validateChannelCredentials(channel)) {
        setError(`Please fill in all required fields for ${channelLabels[channel]}`);
        return;
      }
    }

    try {
      setLoading(true);

      // 创建订阅
      const subscription = await subscriptionService.createSubscription({
        planType: selectedPlan,
        channelCredentials: selectedChannels.map((channel) => ({
          channelType: channel,
          credentials: channelCredentials[channel],
        })),
      });

      // 跳转到支付页面
      navigate(`/payment?subscriptionId=${subscription.id}&plan=${selectedPlan}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create subscription');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscribe-page">
      <header style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700 }}>Configure Your Subscription</h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Select your plan and configure your channels
        </p>
      </header>

      <div className="subscribe-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Plan Selection */}
        <section className="plan-section" style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>1. Select Plan</h2>
          <div className="plan-options" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {(['BASIC', 'PRO', 'ENTERPRISE'] as SubscriptionPlan[]).map((plan) => (
              <div
                key={plan}
                className={`plan-option ${selectedPlan === plan ? 'selected' : ''}`}
                onClick={() => setSelectedPlan(plan)}
                style={{
                  padding: '16px 24px',
                  border: `2px solid ${selectedPlan === plan ? '#1976d2' : '#e0e0e0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedPlan === plan ? '#f5f9ff' : 'white',
                  minWidth: '120px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '18px' }}>{plan}</div>
                <div style={{ color: '#666', marginTop: '4px' }}>
                  ¥{plan === 'BASIC' ? '39' : plan === 'PRO' ? '99' : '199'}/mo
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Channel Selection */}
        <section className="channel-section" style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>2. Select Channels</h2>
          <div className="channel-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(Object.keys(channelLabels) as ChannelType[]).map((channel) => (
              <div
                key={channel}
                className={`channel-option ${selectedChannels.includes(channel) ? 'selected' : ''}`}
                style={{
                  padding: '16px',
                  border: `2px solid ${selectedChannels.includes(channel) ? '#1976d2' : '#e0e0e0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedChannels.includes(channel) ? '#f5f9ff' : 'white',
                }}
                onClick={() => handleChannelToggle(channel)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{channelLabels[channel]}</div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                      {channelDescriptions[channel]}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(channel)}
                    onChange={() => {}}
                    style={{ width: '20px', height: '20px' }}
                  />
                </div>

                {selectedChannels.includes(channel) && (
                  <div className="channel-credentials" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                    <h4 style={{ marginBottom: '12px' }}>Channel Credentials</h4>

                    {channel === 'feishu' && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            App ID *
                          </label>
                          <input
                            type="text"
                            value={channelCredentials.feishu.appId || ''}
                            onChange={(e) => handleChannelCredentialChange('feishu', 'appId', e.target.value)}
                            placeholder="cli_xxxxx"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            App Secret *
                          </label>
                          <input
                            type="password"
                            value={channelCredentials.feishu.appSecret || ''}
                            onChange={(e) => handleChannelCredentialChange('feishu', 'appSecret', e.target.value)}
                            placeholder="Your app secret"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            Webhook Token *
                          </label>
                          <input
                            type="text"
                            value={channelCredentials.feishu.webhookToken || ''}
                            onChange={(e) => handleChannelCredentialChange('feishu', 'webhookToken', e.target.value)}
                            placeholder="Your webhook token"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </>
                    )}

                    {channel === 'dingtalk' && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            App Key *
                          </label>
                          <input
                            type="text"
                            value={channelCredentials.dingtalk.appKey || ''}
                            onChange={(e) => handleChannelCredentialChange('dingtalk', 'appKey', e.target.value)}
                            placeholder="Your app key"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            App Secret *
                          </label>
                          <input
                            type="password"
                            value={channelCredentials.dingtalk.appSecret || ''}
                            onChange={(e) => handleChannelCredentialChange('dingtalk', 'appSecret', e.target.value)}
                            placeholder="Your app secret"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </>
                    )}

                    {channel === 'wechat' && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            Corp ID *
                          </label>
                          <input
                            type="text"
                            value={channelCredentials.wechat.corpId || ''}
                            onChange={(e) => handleChannelCredentialChange('wechat', 'corpId', e.target.value)}
                            placeholder="Your corp ID"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            Secret *
                          </label>
                          <input
                            type="password"
                            value={channelCredentials.wechat.secret || ''}
                            onChange={(e) => handleChannelCredentialChange('wechat', 'secret', e.target.value)}
                            placeholder="Your secret"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </>
                    )}

                    {channel === 'telegram' && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            Bot Token *
                          </label>
                          <input
                            type="text"
                            value={channelCredentials.telegram.botToken || ''}
                            onChange={(e) => handleChannelCredentialChange('telegram', 'botToken', e.target.value)}
                            placeholder="123456:ABCdefGHI..."
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            Chat ID *
                          </label>
                          <input
                            type="text"
                            value={channelCredentials.telegram.chatId || ''}
                            onChange={(e) => handleChannelCredentialChange('telegram', 'chatId', e.target.value)}
                            placeholder="Your chat ID"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </>
                    )}

                    <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                      * These credentials will be encrypted and securely stored.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Summary */}
        <section className="summary-section" style={{ marginBottom: '48px' }}>
          <div
            className="summary-box"
            style={{
              padding: '24px',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
            }}
          >
            <h3 style={{ marginBottom: '16px' }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Plan:</span>
              <span style={{ fontWeight: 600 }}>{selectedPlan}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Channels:</span>
              <span style={{ fontWeight: 600 }}>{selectedChannels.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span>Price:</span>
              <span style={{ fontWeight: 600, fontSize: '18px' }}>
                ¥{selectedPlan === 'BASIC' ? 39 : selectedPlan === 'PRO' ? 99 : 199}
                <span style={{ fontSize: '14px', fontWeight: 400 }}>/month</span>
              </span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontWeight: 600, fontSize: '18px' }}>
                ¥{selectedPlan === 'BASIC' ? 39 : selectedPlan === 'PRO' ? 99 : 199}
              </span>
            </div>
          </div>
        </section>

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

        {/* Submit Button */}
        <div className="submit-section" style={{ textAlign: 'center' }}>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '14px 48px',
              fontSize: '16px',
              fontWeight: 600,
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}