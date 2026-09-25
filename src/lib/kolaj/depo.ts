"use client";

import type { KolajAyarlari, KolajResmi, KolajSayfasi } from "./duzen";

// The collage project survives a reload: page structure and settings in one
// record, each photo's file as its own blob, all in this browser's IndexedDB.

const DB_ADI = "eksperix-kolaj";
const PROJE = "proje";
const RESIM = "resimler";
const ANAHTAR = "aktif";

type KayitliResim = Omit<KolajResmi, "url">;

interface KayitliProje {
  sayfalar: { id: string; duzen: KolajSayfasi["duzen"]; resimler: (KayitliResim | null)[] }[];
  ayarlar: KolajAyarlari;
  guncelleme: string;
}

let dbSozu: Promise<IDBDatabase> | null = null;

function dbAc(): Promise<IDBDatabase> {
  if (!dbSozu) {
    dbSozu = new Promise<IDBDatabase>((resolve, reject) => {
      const istek = indexedDB.open(DB_ADI, 1);
      istek.onupgradeneeded = () => {
        const db = istek.result;
        if (!db.objectStoreNames.contains(PROJE)) db.createObjectStore(PROJE);
        if (!db.objectStoreNames.contains(RESIM)) db.createObjectStore(RESIM);
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

function iste<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function bitir(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Kayıt iptal edildi"));
  });
}

export async function projeYukle(): Promise<{ sayfalar: KolajSayfasi[]; ayarlar: KolajAyarlari; bloblar: Map<string, Blob> } | null> {
  const db = await dbAc();
  const tx = db.transaction([PROJE, RESIM], "readonly");
  const kayit = (await iste(tx.objectStore(PROJE).get(ANAHTAR))) as KayitliProje | undefined;
  if (!kayit) return null;
  const bloblar = new Map<string, Blob>();
  const sayfalar: KolajSayfasi[] = [];
  for (const s of kayit.sayfalar) {
    const resimler: (KolajResmi | null)[] = [];
    for (const r of s.resimler) {
      if (!r) {
        resimler.push(null);
        continue;
      }
      const blob = (await iste(tx.objectStore(RESIM).get(r.id))) as Blob | undefined;
      if (!blob) {
        // The file is gone (storage cleared); leave the slot empty.
        resimler.push(null);
        continue;
      }
      bloblar.set(r.id, blob);
      resimler.push({ ...r, url: URL.createObjectURL(blob) });
    }
    sayfalar.push({ id: s.id, duzen: s.duzen, resimler });
  }
  return { sayfalar, ayarlar: kayit.ayarlar, bloblar };
}

// Writes the project, stores any photo file not yet saved and drops files no
// page refers to any more.
export async function projeKaydet(sayfalar: KolajSayfasi[], ayarlar: KolajAyarlari, bloblar: Map<string, Blob>): Promise<void> {
  const db = await dbAc();
  const kullanilan = new Set<string>();
  const kayit: KayitliProje = {
    sayfalar: sayfalar.map((s) => ({
      id: s.id,
      duzen: s.duzen,
      resimler: s.resimler.map((r) => {
        if (!r) return null;
        kullanilan.add(r.id);
        const { url: _url, ...geri } = r; // eslint-disable-line @typescript-eslint/no-unused-vars
        return geri;
      }),
    })),
    ayarlar,
    guncelleme: new Date().toISOString(),
  };
  const mevcut = new Set(((await iste(db.transaction(RESIM).objectStore(RESIM).getAllKeys())) as IDBValidKey[]).map(String));
  const tx = db.transaction([PROJE, RESIM], "readwrite");
  tx.objectStore(PROJE).put(kayit, ANAHTAR);
  for (const id of kullanilan) {
    const blob = bloblar.get(id);
    if (!mevcut.has(id) && blob) tx.objectStore(RESIM).put(blob, id);
  }
  for (const id of mevcut) if (!kullanilan.has(id)) tx.objectStore(RESIM).delete(id);
  await bitir(tx);
}

export async function projeSil(): Promise<void> {
  const db = await dbAc();
  const tx = db.transaction([PROJE, RESIM], "readwrite");
  tx.objectStore(PROJE).clear();
  tx.objectStore(RESIM).clear();
  await bitir(tx);
}
