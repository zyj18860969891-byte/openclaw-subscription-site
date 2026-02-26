import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './Navigation.css';

export function Navigation() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navigation" style={{
      backgroundColor: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      <div className="nav-left" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link to="/" className="logo" style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1976d2',
          textDecoration: 'none',
        }}>
          OpenClaw
        </Link>

        {isAuthenticated && (
          <div className="nav-links" style={{ display: 'flex', gap: '24px' }}>
            <Link
              to="/dashboard"
              style={{
                color: '#666',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
            >
              Dashboard
            </Link>
            <Link
              to="/pricing"
              style={{
                color: '#666',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
            >
              Pricing
            </Link>
            <Link
              to="/subscribe"
              style={{
                color: '#666',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
            >
              Subscribe
            </Link>
          </div>
        )}
      </div>

      <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isAuthenticated ? (
          <>
            <span style={{ color: '#666', fontSize: '14px' }}>
              Welcome, {user?.name || user?.email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#1976d2',
                border: '1px solid #1976d2',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              to="/login"
              style={{
                padding: '8px 16px',
                color: '#1976d2',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Login
            </Link>
            <Link
              to="/register"
              style={{
                padding: '8px 16px',
                backgroundColor: '#1976d2',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 500,
              }}
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}