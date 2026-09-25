import type { EmsalHaritaKaydi } from "@/lib/emsal-haritasi/types";
import type { Talep } from "@/lib/talep/types";
import { talepSatirlari } from "./ozet";

// Notifications are derived from the data itself (nothing is stored except
// which ids the user has already seen), so they are always in step with it.
// An id changes when the underlying fact changes (e.g. a new target date), so
// a re-planned deadline notifies again.

export type BildirimTuru = "gecikme" | "yaklasan" | "durgun" | "emsal";

export interface Bildirim {
  id: string;
  tur: BildirimTuru;
  baslik: string;
  aciklama: string;
  href: string;
  // Lower sorts first.
  oncelik: number;
}

const DURGUN_GUN = 14;
const YAKLASAN_GUN = 3;
const YENI_EMSAL_GUN = 7;

export function bildirimleriOlustur(
  talepler: Talep[],
  simdi: Date,
  emsaller: EmsalHaritaKaydi[] = [],
  kullaniciId?: string,
): Bildirim[] {
  const liste: Bildirim[] = [];

  for (const s of talepSatirlari(talepler, simdi)) {
    if (s.durum === "Tamamlandı") continue;
    const t = s.talep;
    const link = `/taleplerim/${encodeURIComponent(t.id)}?bolum=talepDetayi`;
    const hedefMetni = s.hedef?.toLocaleDateString("tr-TR") ?? "";

    if (s.kalanGun !== null && s.kalanGun < 0) {
      liste.push({
        id: `gecikme:${t.id}:${t.tapular[0]?.talepDetayi.hedefTeslimTarihi}`,
        tur: "gecikme",
        baslik: `${t.talepNo} teslimi ${-s.kalanGun} gün gecikti`,
        aciklama: `${t.musteriUnvani} · hedef ${hedefMetni} · %${s.pct} tamamlandı`,
        href: link,
        oncelik: 0,
      });
    } else if (s.kalanGun !== null && s.kalanGun <= YAKLASAN_GUN) {
      liste.push({
        id: `yaklasan:${t.id}:${t.tapular[0]?.talepDetayi.hedefTeslimTarihi}`,
        tur: "yaklasan",
        baslik:
          s.kalanGun === 0
            ? `${t.talepNo} bugün teslim edilmeli`
            : s.kalanGun === 1
              ? `${t.talepNo} yarın teslim edilmeli`
              : `${t.talepNo} teslimine ${s.kalanGun} gün kaldı`,
        aciklama: `${t.musteriUnvani} · hedef ${hedefMetni} · %${s.pct} tamamlandı`,
        href: link,
        oncelik: 1 + s.kalanGun / 10,
      });
    } else if (
      s.hedef === null &&
      s.olusturma &&
      simdi.getTime() - s.olusturma.getTime() >= DURGUN_GUN * 86_400_000 &&
      s.pct < 50
    ) {
      const gun = Math.floor((simdi.getTime() - s.olusturma.getTime()) / 86_400_000);
      liste.push({
        id: `durgun:${t.id}`,
        tur: "durgun",
        baslik: `${t.talepNo} ${gun} gündür ilerlemedi (%${s.pct})`,
        aciklama: `${t.musteriUnvani} · hedef teslim tarihi de girilmemiş`,
        href: `/taleplerim/${encodeURIComponent(t.id)}`,
        oncelik: 2,
      });
    }
  }

  // Emsaller other people added recently — one grouped notification.
  const sinir = simdi.getTime() - YENI_EMSAL_GUN * 86_400_000;
  const yeniler = emsaller
    .filter((e) => e.ekleyenKullaniciId !== kullaniciId && Date.parse(e.olusturmaTarihi) >= sinir)
    .sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi));
  if (yeniler.length > 0) {
    const ekleyenler = [...new Set(yeniler.map((e) => e.ekleyenAdSoyad).filter(Boolean))];
    liste.push({
      id: `emsal:${yeniler[0].id}`,
      tur: "emsal",
      baslik: `Emsal Haritası'na ${yeniler.length} yeni emsal eklendi`,
      aciklama: `Son ${YENI_EMSAL_GUN} gün · ${ekleyenler.slice(0, 2).join(", ")}${ekleyenler.length > 2 ? " ve diğerleri" : ""}`,
      href: `/deger-haritasi/emsal-haritasi?odak=${encodeURIComponent(yeniler[0].id)}`,
      oncelik: 3,
    });
  }

  return liste.sort((a, b) => a.oncelik - b.oncelik);
}

// ---- Seen state (per browser) ----------------------------------------------

const OKUNAN_ANAHTARI = "eksperix:okunan-bildirimler:v1";

export function okunanlariOku(): Set<string> {
  try {
    const raw = window.localStorage.getItem(OKUNAN_ANAHTARI);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

// Keeps only ids that still exist, so the list can't grow forever.
export function okunanlariYaz(okunan: Set<string>, mevcutIdler: string[]): void {
  try {
    const mevcut = new Set(mevcutIdler);
    window.localStorage.setItem(OKUNAN_ANAHTARI, JSON.stringify([...okunan].filter((id) => mevcut.has(id))));
  } catch {
    // Storage blocked: notifications just show as unread again next time.
  }
}
