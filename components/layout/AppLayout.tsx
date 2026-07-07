'use client';

import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className="main-content">
        <main className="page-content">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
