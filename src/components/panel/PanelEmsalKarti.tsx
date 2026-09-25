import Link from "next/link";
import { ArrowRight, MapPinned, Plus } from "lucide-react";
import Card from "@/components/card";
import { formatTrNumber } from "@/lib/emsal/hesaplama";

export interface PanelEmsalOzeti {
  toplam: number;
  son30Gun: number;
  benim: number;
  satilikMedyan: number | null;
  kiralikMedyan: number | null;
  sonEklenenler: { id: string; baslik: string; konum: string; birim: number | null; kiralik: boolean }[];
  hata?: string;
}

// Summary of the shared Emsal Haritası (server data) with shortcuts into it.
export default function PanelEmsalKarti({ ozet }: { ozet: PanelEmsalOzeti }) {
  return (
    <Card
      title="Emsal Haritası"
      action={
        <Link
          href="/deger-haritasi/emsal-haritasi"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Haritayı aç
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {ozet.hata ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{ozet.hata}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Toplam</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">{ozet.toplam}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Son 30 gün</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">+{ozet.son30Gun}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Benim</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">{ozet.benim}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-lime-200 bg-lime-50 px-3 py-2">
              <p className="text-[10px] font-medium text-lime-800">Satılık medyan</p>
              <p className="font-semibold tabular-nums text-slate-900">
                {ozet.satilikMedyan === null ? "—" : `${formatTrNumber(ozet.satilikMedyan)} ₺/m²`}
              </p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
              <p className="text-[10px] font-medium text-sky-800">Kiralık medyan</p>
              <p className="font-semibold tabular-nums text-slate-900">
                {ozet.kiralikMedyan === null ? "—" : `${formatTrNumber(ozet.kiralikMedyan)} ₺/m²`}
              </p>
            </div>
          </div>

          {ozet.sonEklenenler.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100">
              {ozet.sonEklenenler.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/deger-haritasi/emsal-haritasi?odak=${encodeURIComponent(e.id)}`}
                    className="flex items-center gap-2 rounded-lg px-1 py-2 text-xs hover:bg-slate-50"
                  >
                    <MapPinned className={`h-3.5 w-3.5 shrink-0 ${e.kiralik ? "text-sky-600" : "text-slate-500"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800">{e.baslik}</span>
                      <span className="block truncate text-slate-400">{e.konum || "Konum yok"}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {e.birim === null ? "—" : formatTrNumber(e.birim)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/deger-haritasi/emsal-haritasi/yeni"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Yeni emsal ekle
          </Link>
        </>
      )}
    </Card>
  );
}
