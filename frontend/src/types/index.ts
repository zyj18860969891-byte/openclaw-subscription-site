// ============================================================================
// Authentication Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthCheckResponse {
  user: User;
  isAuthenticated: boolean;
}

// ============================================================================
// Subscription & Plan Types
// ============================================================================

export type SubscriptionPlan = 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface PlanFeature {
  name: string;
  description?: string;
  included: boolean;
}

export interface Plan {
  id: string;
  name: SubscriptionPlan;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: PlanFeature[];
  maxInstances: number;
  maxChannels: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: Plan;
  status: 'active' | 'inactive' | 'cancelled' | 'pending';
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
  message?: string;
}

export interface ListSubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SubscriptionPlanDetails {
  planType: SubscriptionPlan;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  billingCycle: string;
  features: PlanFeature[];
  limits: {
    maxInstances: number;
    maxChannels: number;
    maxApiCalls: number;
    storageGB: number;
  };
}

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentMethod = 'alipay_pc' | 'alipay_h5' | 'wechat_h5' | 'wechat_jsapi';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type CurrencyType = 'CNY' | 'USD';

export interface CreatePaymentRequest {
  subscriptionId?: string;
  planId: string;
  amount: number;
  currency: CurrencyType;
  paymentMethod: PaymentMethod;
  description: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface PaymentResponse {
  paymentId: string;
  subscriptionId?: string;
  status: PaymentStatus;
  amount: number;
  currency: CurrencyType;
  paymentMethod: PaymentMethod;
  redirectUrl?: string;
  qrCode?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  planId: string;
  amount: number;
  currency: CurrencyType;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ListPaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Invoice {
  id: string;
  userId: string;
  paymentId: string;
  subscriptionId: string;
  amount: number;
  currency: CurrencyType;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Railway Instance Types
// ============================================================================

export type InstanceStatus =
  | 'initializing'
  | 'deploying'
  | 'running'
  | 'degraded'
  | 'error'
  | 'destroying'
  | 'destroyed';

export type DeploymentStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'cancelled';

export type ChannelType = 'feishu' | 'dingtalk' | 'wechat' | 'telegram';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export interface ChannelCredential {
  type: ChannelType;
  appId: string;
  appSecret: string;
  webhookUrl?: string;
  otherConfig?: Record<string, any>;
}

export interface DeploymentLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
}

export interface RailwayInstance {
  id: string;
  subscriptionId: string;
  userId: string;
  projectId: string;
  projectName: string;
  status: InstanceStatus;
  deploymentStatus: DeploymentStatus;
  environment: string;
  region: string;
  domain?: string;
  healthStatus: HealthStatus;
  deploymentProgress: number;
  logs: DeploymentLog[];
  variables: Record<string, string>;
  channelConfig: ChannelCredential[];
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
  lastHealthCheckAt?: string;
}

export interface CreateInstanceRequest {
  subscriptionId: string;
  projectName: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  sourceProjectId?: string;
  channelConfig: ChannelCredential[];
}

export interface CreateInstanceResponse {
  instance: RailwayInstance;
  message: string;
}

export interface ListInstancesResponse {
  instances: RailwayInstance[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InstanceStatusResponse {
  instance: RailwayInstance;
  message: string;
}

export interface RedeployInstanceRequest {
  reason?: string;
}

export interface RedeployInstanceResponse {
  instance: RailwayInstance;
  deploymentId: string;
  message: string;
}

export interface UpdateInstanceRequest {
  environment?: string;
  variables?: Record<string, string>;
  channelConfig?: ChannelCredential[];
}

export interface UpdateInstanceResponse {
  instance: RailwayInstance;
  message: string;
}

export interface DeleteInstanceRequest {
  reason?: string;
}

export interface DeleteInstanceResponse {
  message: string;
  instanceId: string;
}

export interface ConfigureChannelRequest {
  channelType: ChannelType;
  credentials: ChannelCredential;
}

export interface ConfigureChannelResponse {
  instance: RailwayInstance;
  message: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  timestamp: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

// ============================================================================
// Form & UI Types
// ============================================================================

export interface FormError {
  field: string;
  message: string;
}

export interface FormState {
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

export interface LoginFormInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormInput {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  agreeToTerms: boolean;
}

export interface PasswordResetFormInput {
  email: string;
}

export interface PasswordChangeFormInput {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
