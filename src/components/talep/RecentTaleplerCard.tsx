"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Card from "@/components/card";
import TalepTable from "@/components/talep/TalepTable";
import { listTalepler } from "@/lib/talep/service";
import type { Talep } from "@/lib/talep/types";

export default function RecentTaleplerCard({ limit = 10 }: { limit?: number }) {
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
        <p className="py-10 text-center text-sm text-slate-400">Yükleniyor...</p>
      ) : talepler.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Henüz talep oluşturulmadı.</p>
      ) : (
        <TalepTable talepler={talepler.slice(0, limit)} onDeleted={reload} />
      )}
    </Card>
  );
}
