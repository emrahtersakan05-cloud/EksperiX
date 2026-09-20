"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import type { PublicUser } from "@/lib/auth/types";

export default function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: PublicUser | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/giris" || pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} user={user} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} user={user} />
        <main className="relative flex-1 overflow-y-auto">
          <div className="pointer-events-none fixed -top-40 right-0 h-80 w-80 rounded-full bg-lime-200/40 blur-3xl" />
          <div className="pointer-events-none fixed top-1/3 -left-24 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
