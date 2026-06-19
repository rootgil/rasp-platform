"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NotificationBanner } from "@/components/layout/notification-banner";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [notifCount, setNotifCount]     = useState(0);

  const handleNotifCount = useCallback((count: number) => {
    setNotifCount(count);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuClick={() => setSidebarOpen(true)} onNotifCountChange={handleNotifCount} />
      <main className="lg:ml-[260px] pt-16">
        <NotificationBanner count={notifCount} />
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
