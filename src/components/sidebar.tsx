"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { navItems, isNavGroup, type NavLeaf } from "@/lib/nav";
import { logoutAction } from "@/lib/auth/actions";
import type { PublicUser } from "@/lib/auth/types";
import { getInitials } from "@/lib/text/initials";

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavLeaf;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-xl py-2.5 pl-3.5 pr-3 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-lime-300 text-slate-900 shadow-[0_0_24px_-4px] shadow-lime-400/60"
          : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-slate-900" : "text-slate-500 group-hover:text-slate-200"}`} />
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar({
  onNavigate,
  user,
}: {
  onNavigate?: () => void;
  user: PublicUser | null;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Araçlarım: pathname.startsWith("/araclarim"),
  });
  const isAdmin = user?.role === "admin";
  const visibleNavItems = navItems.filter((item) => isNavGroup(item) || !item.adminOnly || isAdmin);

  return (
    <aside className="relative flex h-full w-64 shrink-0 flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-lime-400/10 blur-3xl" />

      <div className="relative flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-300 text-sm font-bold text-slate-900 shadow-[0_0_24px_-4px] shadow-lime-400/70">
          EX
        </div>
        <div className="leading-tight">
          <span className="block text-base font-semibold tracking-tight text-white">Eksperix</span>
          <span className="block text-[11px] text-slate-500">Değerleme Platformu</span>
        </div>
      </div>

      <div className="relative flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        <p className="px-3.5 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Menü
        </p>
        {visibleNavItems.map((item) => {
          if (isNavGroup(item)) {
            const Icon = item.icon;
            const open = openGroups[item.label];
            const groupActive = item.children.some((c) => pathname === c.href);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({ ...prev, [item.label]: !prev[item.label] }))
                  }
                  className={`flex w-full items-center gap-3 rounded-xl py-2.5 pl-3.5 pr-3 text-sm font-medium transition-colors ${
                    groupActive
                      ? "text-white"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${groupActive ? "text-lime-300" : "text-slate-500"}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="mt-1 ml-3.5 space-y-1 border-l border-slate-800 pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.href}
                        item={child}
                        active={pathname === child.href}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink key={item.href} item={item} active={pathname === item.href} onNavigate={onNavigate} />
          );
        })}
      </div>

      <div className="relative px-3 pb-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-300 text-sm font-semibold text-slate-900">
            {getInitials(user?.fullName ?? "Kullanıcı")}
          </div>
          <Link href="/hesabim" onClick={onNavigate} title="Hesabım" className="min-w-0 flex-1 leading-tight hover:opacity-80">
            <p className="truncate text-sm font-medium text-white">{user?.fullName ?? "Kullanıcı"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email || "Hesabım"}</p>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white"
              aria-label="Çıkış yap"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
