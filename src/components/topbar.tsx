"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import BildirimMerkezi from "@/components/BildirimMerkezi";
import GenelArama from "@/components/GenelArama";
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
        <GenelArama admin={user?.role === "admin"} />

        <BildirimMerkezi kullaniciId={user?.id} />

        <Link
          href="/hesabim"
          title="Hesabım"
          className="ml-1 flex items-center gap-2.5 rounded-r-xl border-l border-slate-200 pl-3 pr-1 hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-lime-300 ring-2 ring-white">
            {getInitials(user?.fullName ?? "Kullanıcı")}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.fullName ?? "Kullanıcı"}</p>
            <p className="text-xs text-slate-500">{user?.role === "admin" ? "Yönetici" : "Eksper"}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
