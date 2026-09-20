"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getTalepCompletion, getTalepDurum, talepDurumDotStyles } from "@/lib/talep/completion";
import { deleteTalep } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";
import { avatarPalette, getInitials } from "@/lib/text/initials";

export default function TalepTable({
  talepler,
  onDeleted,
}: {
  talepler: Talep[];
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    await deleteTalep(id);
    setConfirmId(null);
    onDeleted?.();
  }

  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead>
          <tr className="text-[11px] whitespace-nowrap uppercase tracking-wider text-slate-400">
            <th className="py-2 pl-4 pr-4 font-medium">Talep No</th>
            <th className="py-2 pr-4 font-medium">Müşteri Unvanı</th>
            <th className="py-2 pr-4 font-medium">Değerleme Firması</th>
            <th className="py-2 pr-4 font-medium">Taşınmaz Niteliği</th>
            <th className="py-2 pr-4 font-medium">Tapu Sayısı</th>
            <th className="py-2 pr-4 font-medium">Durum</th>
            <th className="py-2 pr-4 font-medium">Oluşturma Tarihi</th>
            <th className="py-2 pr-4 font-medium" />
          </tr>
        </thead>
        <tbody>
          {talepler.map((talep, i) => {
            const completion = getTalepCompletion(talep);
            const durum = getTalepDurum(completion.pct);
            const confirming = confirmId === talep.id;
            return (
              <tr
                key={talep.id}
                onClick={() => !confirming && router.push(`/taleplerim/${talep.id}`)}
                className="cursor-pointer border-t border-slate-50 transition-colors hover:bg-slate-50/70"
              >
                <td className="whitespace-nowrap py-3 pl-4 pr-4 font-medium text-slate-800">{talep.talepNo}</td>
                <td className="py-3 pr-4 text-slate-600">
                  <div className="flex max-w-[200px] items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-white ${avatarPalette[i % avatarPalette.length]}`}
                    >
                      {getInitials(talep.musteriUnvani || "?")}
                    </span>
                    <span className="truncate" title={talep.musteriUnvani}>
                      {talep.musteriUnvani}
                    </span>
                  </div>
                </td>
                <td className="max-w-[200px] truncate py-3 pr-4 text-slate-600" title={talep.degerlemeFirmasi}>
                  {talep.degerlemeFirmasi}
                </td>
                <td className="max-w-[200px] truncate py-3 pr-4 text-slate-600" title={talep.tasinmazNiteligi}>
                  {talep.tasinmazNiteligi}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-slate-600">{talep.tapular.length}</td>
                <td className="whitespace-nowrap py-3 pr-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <span className={`h-1.5 w-1.5 rounded-full ${talepDurumDotStyles[durum]}`} />
                      {durum} &middot; %{completion.pct}
                    </span>
                    <span className="h-1 w-28 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                      <span
                        className={`block h-full rounded-full ${talepDurumDotStyles[durum]}`}
                        style={{ width: `${completion.pct}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-slate-600">
                  {new Date(talep.olusturmaTarihi).toLocaleDateString("tr-TR")}
                </td>
                <td className="py-3 pr-4 text-right">
                  {confirming ? (
                    <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDelete(talep.id)}
                        className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Sil
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                      >
                        Vazgeç
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmId(talep.id);
                      }}
                      className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Talebi sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
