import { getCurrentUser } from "@/lib/auth/dal";
import { listEmsalKayitlari, teshisEt } from "@/lib/emsal-haritasi/store";
import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import EmsalHaritasiClient from "@/components/emsal-haritasi/EmsalHaritasiClient";

export default async function EmsalHaritasiPage() {
  const user = await getCurrentUser();

  let records: EmsalHaritaKaydi[] = [];
  let storeError: string | undefined;
  try {
    records = await listEmsalKayitlari();
  } catch (err) {
    storeError = `Emsal verileri yüklenemedi. Teşhis: ${teshisEt(err)}.`;
  }

  return <EmsalHaritasiClient records={records} currentUser={user} storeError={storeError} />;
}
