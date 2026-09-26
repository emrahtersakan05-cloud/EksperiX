"use client";

// Faydalı Dosyalar: a personal file library (templates, regulations, price
// lists) kept in this browser's IndexedDB. Separate database from the
// talepler so neither needs the other's schema version.

export interface DosyaKaydi {
  id: string;
  ad: string;
  kategori: string;
  aciklama: string;
  tur: string;
  boyut: number;
  eklenme: string;
  veri: Blob;
}

export type DosyaOzeti = Omit<DosyaKaydi, "veri">;

export const KATEGORILER = ["Şablon", "Mevzuat", "Birim Maliyet", "Rapor Örneği", "Diğer"] as const;

// Large enough for scanned regulations, small enough not to exhaust the
// browser's quota with one upload.
export const AZAMI_BOYUT = 25 * 1024 * 1024;

const DB_ADI = "eksperix-dosyalar";
const STORE = "dosyalar";

let dbSozu: Promise<IDBDatabase> | null = null;

function dbAc(): Promise<IDBDatabase> {
  if (!dbSozu) {
    dbSozu = new Promise<IDBDatabase>((resolve, reject) => {
      const istek = indexedDB.open(DB_ADI, 1);
      istek.onupgradeneeded = () => {
        if (!istek.result.objectStoreNames.contains(STORE)) istek.result.createObjectStore(STORE, { keyPath: "id" });
      };
      istek.onsuccess = () => resolve(istek.result);
      istek.onerror = () => reject(istek.error);
    }).catch((err) => {
      dbSozu = null;
      throw err;
    });
  }
  return dbSozu;
}

function islem<T>(mod: IDBTransactionMode, is: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return dbAc().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mod);
        const istek = is(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(istek.result);
        tx.onerror = () => reject(tx.error ?? istek.error);
        tx.onabort = () => reject(tx.error ?? new Error("İşlem iptal edildi"));
      }),
  );
}

export async function dosyalariListele(): Promise<DosyaOzeti[]> {
  const hepsi = await islem<DosyaKaydi[]>("readonly", (s) => s.getAll());
  return hepsi
    .map(({ veri: _veri, ...ozet }) => ozet) // eslint-disable-line @typescript-eslint/no-unused-vars
    .sort((a, b) => b.eklenme.localeCompare(a.eklenme));
}

export async function dosyaEkle(dosya: File, kategori: string, aciklama = ""): Promise<DosyaOzeti> {
  if (dosya.size > AZAMI_BOYUT) throw new Error(`${dosya.name} 25 MB sınırını aşıyor.`);
  const kayit: DosyaKaydi = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ad: dosya.name,
    kategori,
    aciklama,
    tur: dosya.type,
    boyut: dosya.size,
    eklenme: new Date().toISOString(),
    veri: dosya,
  };
  try {
    await islem("readwrite", (s) => s.put(kayit));
  } catch (err) {
    if ((err as DOMException)?.name === "QuotaExceededError") throw new Error("Tarayıcı depolama alanı dolu; bazı dosyaları silin.");
    throw err;
  }
  const { veri: _veri, ...ozet } = kayit; // eslint-disable-line @typescript-eslint/no-unused-vars
  return ozet;
}

export async function dosyaGetir(id: string): Promise<DosyaKaydi | undefined> {
  return islem<DosyaKaydi | undefined>("readonly", (s) => s.get(id));
}

export async function dosyaGuncelle(id: string, degisiklik: Partial<Pick<DosyaKaydi, "ad" | "kategori" | "aciklama">>): Promise<void> {
  const mevcut = await dosyaGetir(id);
  if (!mevcut) return;
  await islem("readwrite", (s) => s.put({ ...mevcut, ...degisiklik }));
}

export async function dosyaSil(id: string): Promise<void> {
  await islem("readwrite", (s) => s.delete(id));
}

export function boyutYaz(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} KB`;
  return `${(bayt / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}
