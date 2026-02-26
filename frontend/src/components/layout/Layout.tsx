import React from 'react';
import { Navigation } from './Navigation';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout" style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
    }}>
      <Navigation />
      <main style={{
        minHeight: 'calc(100vh - 64px)',
        paddingTop: '24px',
      }}>
        {children}
      </main>
      <footer style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e0e0e0',
        padding: '24px',
        textAlign: 'center',
        color: '#666',
        fontSize: '14px',
      }}>
        <div style={{ marginBottom: '8px' }}>
          © 2025 OpenClaw. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/terms" style={{ color: '#666', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/support" style={{ color: '#666', textDecoration: 'none' }}>Support</a>
          <a href="/docs" style={{ color: '#666', textDecoration: 'none' }}>Documentation</a>
        </div>
      </footer>
    </div>
  );
}