import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export default function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60">
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lime-300 shadow-[0_0_32px_-8px] shadow-lime-400/40">
            <Icon className="h-7 w-7" />
            <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-lime-300 text-slate-900 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Bu sayfa yakında hazır olacak</p>
            <p className="max-w-sm text-sm text-slate-500">
              {title} modülü şu anda geliştirme aşamasındadır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
