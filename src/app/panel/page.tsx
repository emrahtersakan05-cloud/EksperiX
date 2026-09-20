import { ClipboardList, Clock3, ListChecks, Timer } from "lucide-react";
import RecentTaleplerCard from "@/components/talep/RecentTaleplerCard";
import StatCard from "@/components/stat-card";
import YeniTalepButton from "@/components/talep/YeniTalepButton";
import ValuationChart from "@/components/valuation-chart";
import { getTalepStats } from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/auth/dal";

export default async function Home() {
  const stats = getTalepStats();
  const user = await getCurrentUser();
  const firstName = user?.fullName.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-8 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Hoş geldiniz, {firstName}</h1>
            <p className="mt-1.5 max-w-md text-sm text-slate-400">
              Taleplerinize ve değerleme raporu istatistiklerinize genel bakış.
            </p>
          </div>
          <YeniTalepButton className="self-start" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam Talep"
          value={String(stats.total)}
          deltaPct={stats.totalDeltaPct}
          icon={ClipboardList}
          accent="blue"
        />
        <StatCard
          label="Bekleyen Talep"
          value={String(stats.pending)}
          deltaPct={stats.pendingDeltaPct}
          icon={Clock3}
          accent="amber"
        />
        <StatCard
          label="Bu Ay Tamamlanan"
          value={String(stats.completedThisMonth)}
          deltaPct={stats.completedDeltaPct}
          icon={ListChecks}
          accent="emerald"
        />
        <StatCard
          label="Ortalama Süre (gün)"
          value={String(stats.avgResolutionDays)}
          deltaPct={stats.avgDeltaPct}
          icon={Timer}
          accent="violet"
        />
      </div>

      <RecentTaleplerCard limit={10} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ValuationChart title="Firma Bazlı Değerleme Rapor Grafiği" metric="company" color="#2563eb" />
        <ValuationChart title="Nitelik Bazlı Değerleme Rapor Grafiği" metric="attribute" color="#059669" />
        <ValuationChart title="Banka Bazlı Değerleme Rapor Grafiği" metric="bank" color="#d97706" />
      </div>
    </div>
  );
}
