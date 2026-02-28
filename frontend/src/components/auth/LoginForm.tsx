import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import './LoginForm.css';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInput) => {
    setIsLoading(true);
    setApiError(null);

    try {
      await login(data.email, data.password);

      // Success - redirect to dashboard
      reset();
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      // Handle login error with specific messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        // Map specific error messages to user-friendly ones
        if (error.message.includes('email') || error.message.includes('user')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('password')) {
          errorMessage = 'Invalid password. Please check your password and try again.';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setApiError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome Back</h1>
        <p className="login-subtitle">Sign in to your account</p>

        {apiError && (
          <div className="error-message" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register('email')}
              className={`form-input ${errors.email ? 'error' : ''}`}
              disabled={isLoading}
            />
            {errors.email && (
              <span className="field-error">{errors.email.message}</span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <div className="password-header">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register('password')}
              className={`form-input ${errors.password ? 'error' : ''}`}
              disabled={isLoading}
            />
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="form-group checkbox">
            <input
              id="rememberMe"
              type="checkbox"
              {...register('rememberMe')}
              disabled={isLoading}
            />
            <label htmlFor="rememberMe">Remember me for 30 days</label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Register Link */}
        <p className="register-prompt">
          Don't have an account?{' '}
          <Link to="/register" className="register-link">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
