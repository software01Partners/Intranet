'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import type { UserRole } from '@/lib/types';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  role: UserRole | null;
}

export function DashboardLayoutClient({
  children,
  role,
}: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto bg-[#F8F9FC] dark:bg-[#0F0F1A]">
          {children}
        </main>
      </div>
    </>
  );
}
