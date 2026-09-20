"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import TalepOlusturModal from "@/components/talep/TalepOlusturModal";

export default function YeniTalepButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_0_24px_-6px] shadow-lime-400/70 transition-transform hover:scale-[1.03] active:scale-[0.98] ${className}`}
      >
        <Plus className="h-4 w-4" />
        Yeni Talep Oluştur
      </button>
      {open && <TalepOlusturModal onClose={() => setOpen(false)} />}
    </>
  );
}
