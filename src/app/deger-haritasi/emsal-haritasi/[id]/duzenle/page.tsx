import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { listEmsalKayitlari } from "@/lib/emsal-haritasi/store";
import EmsalKayitFormu from "@/components/emsal-haritasi/EmsalKayitFormu";

export default async function EmsalDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, records] = await Promise.all([getCurrentUser(), listEmsalKayitlari()]);
  const kaydi = records.find((r) => r.id === id);
  if (!kaydi) notFound();
  // Same rule as the update action, which re-checks it on save.
  if (!user || (user.role !== "admin" && user.id !== kaydi.ekleyenKullaniciId)) {
    redirect("/deger-haritasi/emsal-haritasi");
  }
  return <EmsalKayitFormu records={records} kaydi={kaydi} />;
}
