"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { getPageTitle } from "@/lib/nav";
import type { PublicUser } from "@/lib/auth/types";
import { getInitials } from "@/lib/text/initials";

export default function Topbar({
  onMenuClick,
  user,
}: {
  onMenuClick: () => void;
  user: PublicUser | null;
}) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 bg-slate-50/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900 lg:hidden"
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Ara..."
            className="w-56 rounded-full border border-slate-200/80 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-lime-300 focus:outline-none focus:ring-4 focus:ring-lime-200/50"
          />
        </div>

        <button
          type="button"
          className="relative rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900"
          aria-label="Bildirimler"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-50" />
        </button>

        <div className="ml-1 flex items-center gap-2.5 border-l border-slate-200 pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-lime-300 ring-2 ring-white">
            {getInitials(user?.fullName ?? "Kullanıcı")}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.fullName ?? "Kullanıcı"}</p>
            <p className="text-xs text-slate-500">{user?.role === "admin" ? "Yönetici" : "Eksper"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
