'use client';

import Sidebar from './Sidebar';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Optionally load bootstrap JS for interactive components like offcanvas, dropdowns, modals.
  useEffect(() => {
    require('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      {/* Mobile Top Navbar */}
      <nav className="navbar navbar-light bg-white border-bottom d-md-none sticky-top px-3 no-print">
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#sidebarMenu"
          aria-controls="sidebarMenu"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <span className="navbar-brand mb-0 h1 fs-5">🥬 VegWholesale</span>
        <div style={{ width: '56px' }}></div> {/* Spacer to center the brand */}
      </nav>

      <div className="container-fluid flex-grow-1 d-flex p-0">
        <Sidebar />
        
        <main className="flex-grow-1 w-100 p-3 p-md-4" style={{ maxWidth: '1200px', margin: '0 auto', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
