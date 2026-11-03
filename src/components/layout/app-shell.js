'use client';

import { useCallback, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export function AppShell({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((current) => !current), []);

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <div className="lg:flex lg:items-start">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={closeSidebar}
          onToggleCollapse={toggleSidebar}
        />
        <div className="flex min-w-0 flex-1 flex-col lg:min-h-screen">
          <Topbar
            title={title}
            onOpenSidebar={openSidebar}
            isSidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />
          <main className="flex-1 p-4 sm:p-6 xl:p-8">
            <div className="mx-auto max-w-[1600px] rounded-[28px] border border-slate-200/80 bg-white/60 p-2 shadow-[0_20px_40px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-3 xl:p-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
