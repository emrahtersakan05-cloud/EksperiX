"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import Card from "@/components/card";
import TalepTable from "@/components/talep/TalepTable";
import YeniTalepButton from "@/components/talep/YeniTalepButton";
import { listTalepler } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";

export default function RecentTaleplerCard({
  limit = 10,
  onDegisti,
}: {
  limit?: number;
  // Lets the Ana Sayfa refresh its figures after a talep is deleted here.
  onDegisti?: () => void;
}) {
  const [talepler, setTalepler] = useState<Talep[] | null>(null);

  function reload() {
    listTalepler().then(setTalepler);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <Card
      title={`Taleplerim (Son ${limit} Talep)`}
      action={
        <Link
          href="/taleplerim"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          Tümünü Gör
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {talepler === null ? (
        <div className="space-y-3 py-4" aria-busy="true" aria-label="Talepler yükleniyor">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : talepler.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-100 text-lime-700">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Henüz talep oluşturulmadı</p>
            <p className="mt-1 text-sm text-slate-500">
              İlk değerleme talebinizi oluşturun; son talepleriniz burada listelenecek.
            </p>
          </div>
          <YeniTalepButton />
        </div>
      ) : (
        <TalepTable
          talepler={talepler.slice(0, limit)}
          onDeleted={() => {
            reload();
            onDegisti?.();
          }}
        />
      )}
    </Card>
  );
}
