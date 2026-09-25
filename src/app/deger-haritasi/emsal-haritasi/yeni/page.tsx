import { listEmsalKayitlari } from "@/lib/emsal-haritasi/store";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import EmsalKayitFormu from "@/components/emsal-haritasi/EmsalKayitFormu";

export default async function YeniEmsalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { eklendi } = await searchParams;
  // Existing records only feed the location map, the duplicate warning and the
  // area comparison, so a store hiccup shouldn't block adding — saving reports
  // its own error.
  let records: EmsalHaritaKaydi[] = [];
  try {
    records = await listEmsalKayitlari();
  } catch {
    records = [];
  }
  // Set after "Kaydet ve yeni ekle": confirm the save on the fresh form.
  const eklenen = typeof eklendi === "string" ? records.find((r) => r.id === eklendi) : undefined;
  // Keyed on the saved id so the form starts empty after each save-and-new.
  return <EmsalKayitFormu key={eklenen?.id ?? "yeni"} records={records} eklenen={eklenen} />;
}
