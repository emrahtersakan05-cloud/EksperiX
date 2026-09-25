"use client";

import { Building2, CalendarClock, CalendarDays, Hash, Landmark, Layers, MapPin, UserRound } from "lucide-react";
import type { Talep, Tapu } from "@/lib/talep/types";
import { avatarPalette, getInitials } from "@/lib/text/initials";

// Cells shared by the Taleplerim and Raporlarım lists. A talep row passes
// all its tapular; a report row passes just its own tapu.

export function tarihYaz(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

function bugunIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Whole days from today to the given yyyy-mm-dd (negative = past).
function gunFarki(iso: string): number {
  const [a, b] = [iso, bugunIso()].map((s) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((a - b) / 86_400_000);
}

export function talepTarihi(talep: Talep, tapu?: Tapu): string {
  return (tapu ?? talep.tapular[0])?.talepDetayi.talepTarihi || talep.olusturmaTarihi.slice(0, 10);
}

// Earliest target date among the tapular (the one that bites first).
export function hedefTarih(tapular: Tapu[]): string {
  return tapular.map((t) => t.talepDetayi.hedefTeslimTarihi).filter(Boolean).sort()[0] ?? "";
}

function TeslimRozeti({ hedef, teslimEdildi }: { hedef: string; teslimEdildi: boolean }) {
  if (!hedef) return null;
  if (teslimEdildi)
    return <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Teslim edildi</span>;
  const fark = gunFarki(hedef);
  const [metin, stil] =
    fark < 0
      ? [`${-fark} gün gecikti`, "bg-rose-100 text-rose-700"]
      : fark === 0
        ? ["Bugün", "bg-amber-100 text-amber-800"]
        : fark <= 2
          ? [`${fark} gün kaldı`, "bg-amber-50 text-amber-700"]
          : [`${fark} gün kaldı`, "bg-slate-100 text-slate-500"];
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${stil}`}>{metin}</span>;
}

// 1. sütun: kimlik, kurum ve tarihler.
export function KimlikHucresi({
  talep,
  tapular,
  altBaslik,
}: {
  talep: Talep;
  tapular: Tapu[];
  altBaslik?: React.ReactNode;
}) {
  const hedef = hedefTarih(tapular);
  const teslimEdildi = tapular.length > 0 && tapular.every((t) => t.raporSonucu.durum === "Teslim Edildi");
  return (
    <div className="min-w-0 space-y-1.5">
      <div>
        <p className="truncate font-semibold text-slate-900">{talep.talepNo}</p>
        {altBaslik && <div className="truncate text-xs text-slate-400">{altBaslik}</div>}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-600" title="Değerleme Kurum / Banka">
        <Landmark className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{talep.degerlemeKurumBanka || "—"}</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1" title="Talep Tarihi">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          {tarihYaz(talepTarihi(talep, tapular[0]))}
        </span>
        <span className="inline-flex items-center gap-1" title="Hedef Teslim Tarihi">
          <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
          {hedef ? tarihYaz(hedef) : "Hedef yok"}
        </span>
        <TeslimRozeti hedef={hedef} teslimEdildi={teslimEdildi} />
      </div>
    </div>
  );
}

function konum(tapu: Tapu) {
  const k = tapu.tapuKaydi;
  const a = tapu.adresKonum;
  return {
    il: k.il || a.il,
    ilce: k.ilce || a.ilce,
    mahalle: k.mahalleKoyAdi || a.mahalle || a.koy,
  };
}

// 2. sütun: müşteri, konum ve taşınmaz künyesi (tapu / ada / parsel / nitelik).
export function TasinmazHucresi({ talep, tapular, renkSirasi }: { talep: Talep; tapular: Tapu[]; renkSirasi: number }) {
  // Tapu count is the talep's, even when the row shows a single tapu (report).
  const tapuSayisi = talep.tapular.length;
  const ilk = tapular[0];
  const k = ilk ? konum(ilk) : { il: "", ilce: "", mahalle: "" };
  const parseller = tapular
    .map((t) => ({ ada: t.tapuKaydi.ada, parsel: t.tapuKaydi.parsel }))
    .filter((p) => p.ada || p.parsel);
  const nitelik = ilk?.talepDetayi.tasinmazNiteligi || talep.tasinmazNiteligi;
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-white ${avatarPalette[renkSirasi % avatarPalette.length]}`}
        >
          {getInitials(talep.musteriUnvani || "?")}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800" title={talep.musteriUnvani}>
            {talep.musteriUnvani || "—"}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{[k.mahalle, k.ilce, k.il].filter(Boolean).join(", ") || "Konum girilmedi"}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-lime-300">
          <Layers className="h-3 w-3" />
          {tapuSayisi} tapu
        </span>
        {parseller.length > 0 ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-lg border border-lime-300 bg-lime-50 px-2 py-1 text-[11px] font-semibold tabular-nums text-lime-900">
              <Hash className="h-3 w-3 text-lime-600" />
              Ada {parseller[0].ada || "—"} / Parsel {parseller[0].parsel || "—"}
            </span>
            {parseller.length > 1 && (
              <span
                className="rounded-lg bg-lime-100 px-1.5 py-1 text-[11px] font-semibold text-lime-800"
                title={parseller.map((p) => `${p.ada}/${p.parsel}`).join(", ")}
              >
                +{parseller.length - 1}
              </span>
            )}
          </>
        ) : (
          <span className="rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-400">
            Ada / parsel yok
          </span>
        )}
        {nitelik && (
          <span className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{nitelik}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// 3. sütun: firma ve eksper.
export function EkipHucresi({ talep, tapular }: { talep: Talep; tapular: Tapu[] }) {
  const eksperler = [...new Set(tapular.map((t) => t.talepDetayi.atananEksper.trim()).filter(Boolean))];
  return (
    <div className="min-w-0 space-y-1.5 text-xs">
      <p className="flex items-center gap-1.5 text-slate-700" title="Değerleme Firması">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate font-medium">{talep.degerlemeFirmasi || "—"}</span>
      </p>
      <p className="flex items-center gap-1.5 text-slate-500" title="Atanan Eksper">
        <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{eksperler.length ? eksperler.join(", ") : "Eksper atanmadı"}</span>
      </p>
    </div>
  );
}
