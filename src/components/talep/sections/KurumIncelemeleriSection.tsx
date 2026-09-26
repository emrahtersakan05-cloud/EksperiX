"use client";

import { Landmark } from "lucide-react";

// The Ruhsat İncelemeleri form was removed; the tab stays, empty for now.
export default function KurumIncelemeleriSection() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
        <Landmark className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-slate-700">Bu bölümde henüz form yok</p>
    </div>
  );
}
