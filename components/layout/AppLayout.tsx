'use client';

import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="app-wrapper">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Mobile top header with hamburger */}
        <div className="header" style={{ justifyContent: 'space-between' }}>
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Open menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <span className="header-title" style={{ textAlign: 'center', fontSize: '0.95rem' }}>
            🥬 VegWholesale
          </span>

          {/* Placeholder to balance flex */}
          <div style={{ width: 38 }} />
        </div>

        <main className="page-content">
          {children}
        </main>
      </div>

      <BottomNav />

      {/* Hide hamburger on desktop */}
      <style>{`
        @media (min-width: 769px) {
          .header { display: none; }
        }
        @media (max-width: 768px) {
          .hamburger-btn { display: flex; }
        }
      `}</style>
    </div>
  );
}
