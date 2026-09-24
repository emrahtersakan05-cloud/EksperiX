import Link from "next/link";
import { ArrowRight, LandPlot, Map } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const sections: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Emsal Haritası",
    description: "Bölgedeki emsal taşınmazları harita üzerinde görüntüleyin ve karşılaştırın.",
    href: "/deger-haritasi/emsal-haritasi",
    icon: LandPlot,
  },
  {
    title: "Değer Haritası",
    description: "Bölgesel değerleme verilerini harita üzerinde görüntüleyin.",
    href: "/deger-haritasi/deger-haritasi",
    icon: Map,
  },
];

export default function DegerHaritasiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Değer Haritası</h1>
        <p className="mt-1 text-sm text-slate-500">
          Emsal ve değer verilerini harita üzerinde incelemek için bir modül seçin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-12px_rgba(15,23,42,0.12)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
                <Icon className="h-5 w-5 text-lime-300" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{section.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{section.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                Görüntüle
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
