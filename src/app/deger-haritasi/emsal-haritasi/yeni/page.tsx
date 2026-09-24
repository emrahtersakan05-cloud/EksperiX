import { listEmsalKayitlari } from "@/lib/emsal-haritasi/store";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import EmsalKayitFormu from "@/components/emsal-haritasi/EmsalKayitFormu";

export default async function YeniEmsalPage() {
  // Existing records only feed the location map and the duplicate warning, so
  // a store hiccup shouldn't block adding — saving reports its own error.
  let records: EmsalHaritaKaydi[] = [];
  try {
    records = await listEmsalKayitlari();
  } catch {
    records = [];
  }
  return <EmsalKayitFormu records={records} />;
}
