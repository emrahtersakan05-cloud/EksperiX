"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search } from "lucide-react";
import Card from "@/components/card";
import TalepOlusturModal from "@/components/talep/TalepOlusturModal";
import TalepTable from "@/components/talep/TalepTable";
import { inputClass } from "@/components/talep/form-fields";
import { listTalepler } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";

export default function TaleplerimPage() {
  const [talepler, setTalepler] = useState<Talep[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  function reload() {
    listTalepler().then(setTalepler);
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    if (!talepler) return null;
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return talepler;
    return talepler.filter((t) =>
      [t.talepNo, t.musteriUnvani, t.degerlemeFirmasi].some((field) =>
        (field ?? "").toLocaleLowerCase("tr-TR").includes(q),
      ),
    );
  }, [talepler, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Taleplerim</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tüm değerleme taleplerinizi buradan görüntüleyip yönetebilirsiniz.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_0_20px_-6px] shadow-lime-400/70 transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          Yeni Talep Oluştur
        </button>
      </div>

      {talepler !== null && talepler.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Talep no, müşteri unvanı veya firma ara..."
            className={`${inputClass} rounded-full pl-9`}
          />
        </div>
      )}

      <Card>
        {talepler === null ? (
          <p className="py-10 text-center text-sm text-slate-400">Yükleniyor...</p>
        ) : talepler.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lime-300">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Henüz talep oluşturmadınız</p>
            <p className="max-w-sm text-sm text-slate-500">
              &quot;Yeni Talep Oluştur&quot; ile ilk değerleme talebinizi başlatın.
            </p>
          </div>
        ) : filtered && filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">&quot;{query}&quot; ile eşleşen talep bulunamadı.</p>
        ) : (
          <TalepTable talepler={filtered ?? []} onDeleted={reload} />
        )}
      </Card>

      {modalOpen && <TalepOlusturModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
