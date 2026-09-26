import { getKurumKisaltma } from "./reference-lists";
import {
  createEmptyTapu,
  newRowId,
  type DegerHesaplamalari,
  type RuhsatIncelemeData,
  type Talep,
  type Tapu,
} from "./types";

const STORAGE_KEY = "eksperix_talepler_v1";

// Backfills any section fields missing from a stored Tapu against the
// current empty-tapu shape. Section field lists evolve (e.g. tapuKaydi was
// reshaped from a flat malikler/serhler list into its current 23-field +
// 3-record-table form) — without this, a Tapu saved under an older shape
// has `undefined` for newly-added fields, and a section component reading
// e.g. `data.mulkiyetKayitlari.length` on that `undefined` crashes outright.
// Değer Hesaplaması inputs changed shape over time (seviyeli used to be a list of
// rows, hisseli had a tamDeger); anything that is not the current shape is dropped.
function normalizeHesaplamalar(stored: unknown, empty: DegerHesaplamalari): DegerHesaplamalari {
  const s = (stored && typeof stored === "object" ? stored : {}) as Partial<Record<keyof DegerHesaplamalari, unknown>>;
  const obj = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});
  const hisseli = obj(s.hisseli) as Partial<DegerHesaplamalari["hisseli"]>;
  const yontemler: DegerHesaplamalari["esasYontem"][] = ["normal", "alanFarki", "seviyeli", "hisseli"];
  return {
    esasYontem: yontemler.includes(s.esasYontem as DegerHesaplamalari["esasYontem"])
      ? (s.esasYontem as DegerHesaplamalari["esasYontem"])
      : "",
    normal: { ...empty.normal, ...obj(s.normal) },
    alanFarki: { ...empty.alanFarki, ...obj(s.alanFarki) },
    seviyeli: { ...empty.seviyeli, ...obj(s.seviyeli) },
    hisseli: {
      ...empty.hisseli,
      alanM2: hisseli.alanM2 ?? "",
      birimFiyat: hisseli.birimFiyat ?? "",
      satirlar: Array.isArray(hisseli.satirlar) ? hisseli.satirlar : [],
    },
  };
}

function normalizeTapu(tapu: Tapu): Tapu {
  const empty = createEmptyTapu(0);
  const legacyKurumIncelemeleri = Array.isArray(tapu.kurumIncelemeleri) ? tapu.kurumIncelemeleri : null;
  const normalizedKurumIncelemeleri: RuhsatIncelemeData = legacyKurumIncelemeleri
    ? {
        ruhsatResmiEvrakVarMi: legacyKurumIncelemeleri.length > 0 ? "Evet" : "",
        incelenenKurumAdi: legacyKurumIncelemeleri[0]?.kurum ?? "",
        belgeler: legacyKurumIncelemeleri.map((item) => ({
          id: item.id ?? newRowId(),
          belgeCinsi: item.incelemeTuru ?? "",
          belgeTarihi: item.tarih ?? "",
          belgeNo: item.notlar ?? "",
        })),
      }
    : { ...empty.kurumIncelemeleri, ...(tapu.kurumIncelemeleri ?? {}) };

  return {
    ...empty,
    ...tapu,
    talepDetayi: { ...empty.talepDetayi, ...tapu.talepDetayi },
    adresKonum: { ...empty.adresKonum, ...tapu.adresKonum },
    tapuKaydi: { ...empty.tapuKaydi, ...tapu.tapuKaydi },
    kurumIncelemeleri: {
      ...empty.kurumIncelemeleri,
      ...normalizedKurumIncelemeleri,
      belgeler: normalizedKurumIncelemeleri.belgeler ?? [],
    },
    projeIncelemeleri: tapu.projeIncelemeleri ?? [],
    imarDurumu: { ...empty.imarDurumu, ...tapu.imarDurumu },
    anaGayrimenkul: { ...empty.anaGayrimenkul, ...tapu.anaGayrimenkul },
    araziOzellikleri: { ...empty.araziOzellikleri, ...tapu.araziOzellikleri },
    konutOzellikleri: { ...empty.konutOzellikleri, ...tapu.konutOzellikleri },
    bagimsizBolum: { ...empty.bagimsizBolum, ...tapu.bagimsizBolum },
    degerleme: {
      ...empty.degerleme,
      ...tapu.degerleme,
      hesaplamalar: normalizeHesaplamalar(tapu.degerleme?.hesaplamalar, empty.degerleme.hesaplamalar),
    },
    emsaller: {
      ...empty.emsaller,
      ...tapu.emsaller,
      satilik1: { ...empty.emsaller.satilik1, ...tapu.emsaller?.satilik1 },
      satilik2: { ...empty.emsaller.satilik2, ...tapu.emsaller?.satilik2 },
      satilik3: { ...empty.emsaller.satilik3, ...tapu.emsaller?.satilik3 },
      satilik4: { ...empty.emsaller.satilik4, ...tapu.emsaller?.satilik4 },
      satilik5: { ...empty.emsaller.satilik5, ...tapu.emsaller?.satilik5 },
      kiralik1: { ...empty.emsaller.kiralik1, ...tapu.emsaller?.kiralik1 },
      kiralik2: { ...empty.emsaller.kiralik2, ...tapu.emsaller?.kiralik2 },
    },
    raporSonucu: { ...empty.raporSonucu, ...tapu.raporSonucu },
    akiciMetinler: { ...(tapu.akiciMetinler ?? {}) },
  };
}

// ---- Storage ----------------------------------------------------------------
// Talepler live in the browser. They used to be one JSON array in
// localStorage, which browsers cap at ~5 MB — and talepler embed the uploaded
// UAVT images and tapu PDFs as data URLs, so a handful of documents hit the
// cap and every later save threw QuotaExceededError (edits silently lost).
// They now live in IndexedDB (quota in the hundreds of MB), one record per
// talep. The localStorage array is migrated on first open, then removed.
// Browsers without IndexedDB keep using localStorage.

const DB_ADI = "eksperix";
const DB_SURUMU = 1;
const DEPO = "talepler";

let dbSozu: Promise<IDBDatabase | null> | null = null;

function istek<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function islemBitti(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB işlemi iptal edildi."));
  });
}

function localStorageOku(): Talep[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Talep[]) : [];
  } catch {
    return [];
  }
}

async function dbAc(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  dbSozu ??= (async () => {
    try {
      const acma = window.indexedDB.open(DB_ADI, DB_SURUMU);
      acma.onupgradeneeded = () => {
        if (!acma.result.objectStoreNames.contains(DEPO)) acma.result.createObjectStore(DEPO, { keyPath: "id" });
      };
      const db = await istek(acma);
      // One-time move of the old localStorage array.
      const eski = localStorageOku();
      if (eski.length > 0) {
        const tx = db.transaction(DEPO, "readwrite");
        const depo = tx.objectStore(DEPO);
        for (const t of eski) depo.put(t);
        await islemBitti(tx);
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return db;
    } catch {
      return null;
    }
  })();
  return dbSozu;
}

// Operations run one after another, so two quick edits of the same talep
// can't both read the old version and overwrite each other.
let kuyruk: Promise<unknown> = Promise.resolve();
function sirayla<T>(is: () => Promise<T>): Promise<T> {
  const sonuc = kuyruk.then(is, is);
  kuyruk = sonuc.catch(() => undefined);
  return sonuc;
}

async function readAll(): Promise<Talep[]> {
  if (typeof window === "undefined") return [];
  const db = await dbAc();
  const ham = db ? await istek(db.transaction(DEPO).objectStore(DEPO).getAll() as IDBRequest<Talep[]>) : localStorageOku();
  return ham.map((t) => ({ ...t, tapular: t.tapular.map(normalizeTapu) }));
}

async function kaydet(talep: Talep): Promise<void> {
  const db = await dbAc();
  if (db) {
    const tx = db.transaction(DEPO, "readwrite");
    tx.objectStore(DEPO).put(talep);
    await islemBitti(tx);
    return;
  }
  const hepsi = localStorageOku().filter((t) => t.id !== talep.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...hepsi, talep]));
}

async function kaldir(id: string): Promise<void> {
  const db = await dbAc();
  if (db) {
    const tx = db.transaction(DEPO, "readwrite");
    tx.objectStore(DEPO).delete(id);
    await islemBitti(tx);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localStorageOku().filter((t) => t.id !== id)));
}

async function tekTalep(id: string): Promise<Talep | undefined> {
  return (await readAll()).find((t) => t.id === id);
}

function nextTalepNo(existing: Talep[], degerlemeKurumBanka: string): string {
  const kisaltma = degerlemeKurumBanka ? getKurumKisaltma(degerlemeKurumBanka) : "GENEL";
  const yil = new Date().getFullYear();
  const prefix = `${kisaltma}-${yil}-`;
  const count = existing.filter((t) => t.talepNo.startsWith(prefix)).length;
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

// Every function below is async so this module can later be swapped for
// real fetch() calls against the Eksperix API without touching callers.

export async function listTalepler(): Promise<Talep[]> {
  return sirayla(async () => (await readAll()).sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi)));
}

export async function getTalep(id: string): Promise<Talep | undefined> {
  return sirayla(() => tekTalep(id));
}

export async function createTalep(input: {
  musteriUnvani: string;
  degerlemeFirmasi: string;
  degerlemeKurumBanka: string;
  tasinmazNiteligi: string;
  tapuSayisi: number;
}): Promise<Talep> {
  return sirayla(async () => {
    const all = await readAll();
    const defaults = {
      musteriUnvani: input.musteriUnvani,
      degerlemeFirmasi: input.degerlemeFirmasi,
      degerlemeKurumBanka: input.degerlemeKurumBanka,
      tasinmazNiteligi: input.tasinmazNiteligi,
    };
    const talep: Talep = {
      id: newRowId(),
      talepNo: nextTalepNo(all, input.degerlemeKurumBanka),
      ...defaults,
      olusturmaTarihi: new Date().toISOString(),
      tapular: Array.from({ length: Math.max(1, input.tapuSayisi) }, (_, i) => createEmptyTapu(i + 1, defaults)),
    };
    await kaydet(talep);
    return talep;
  });
}

export async function deleteTalep(id: string): Promise<void> {
  return sirayla(() => kaldir(id));
}

// Read → change → write one talep, as a single queued step.
function talebiDegistir(talepId: string, degistir: (talep: Talep) => void): Promise<Talep | undefined> {
  return sirayla(async () => {
    const talep = await tekTalep(talepId);
    if (!talep) return undefined;
    degistir(talep);
    await kaydet(talep);
    return talep;
  });
}

export async function addTapu(talepId: string): Promise<Talep | undefined> {
  return talebiDegistir(talepId, (talep) => {
    talep.tapular.push(
      createEmptyTapu(talep.tapular.length + 1, {
        musteriUnvani: talep.musteriUnvani,
        degerlemeFirmasi: talep.degerlemeFirmasi,
        degerlemeKurumBanka: talep.degerlemeKurumBanka,
        tasinmazNiteligi: talep.tasinmazNiteligi,
      }),
    );
  });
}

export async function removeTapu(talepId: string, tapuId: string): Promise<Talep | undefined> {
  return talebiDegistir(talepId, (talep) => {
    talep.tapular = talep.tapular.filter((t) => t.id !== tapuId);
  });
}

export async function renameTapu(talepId: string, tapuId: string, ad: string): Promise<Talep | undefined> {
  return talebiDegistir(talepId, (talep) => {
    talep.tapular = talep.tapular.map((t) => (t.id === tapuId ? { ...t, ad } : t));
  });
}

export async function updateTapu(
  talepId: string,
  tapuId: string,
  updater: (tapu: Tapu) => Tapu,
): Promise<Talep | undefined> {
  return talebiDegistir(talepId, (talep) => {
    talep.tapular = talep.tapular.map((t) => (t.id === tapuId ? updater(t) : t));
  });
}

// ---- Backup -------------------------------------------------------------------
// Talepler exist only in this browser, so a downloadable backup is the way to
// move them to another computer or survive a cleared browser.

export interface TalepYedegi {
  tur: "eksperix-talep-yedegi";
  surum: 1;
  olusturma: string;
  talepler: Talep[];
}

export async function yedekOlustur(): Promise<TalepYedegi> {
  return sirayla(async () => ({
    tur: "eksperix-talep-yedegi",
    surum: 1,
    olusturma: new Date().toISOString(),
    talepler: await readAll(),
  }));
}

export interface YedekOzeti {
  yeni: number;
  guncellenecek: number;
}

function yedegiDogrula(veri: unknown): Talep[] {
  const y = veri as Partial<TalepYedegi> | null;
  if (!y || y.tur !== "eksperix-talep-yedegi" || !Array.isArray(y.talepler)) {
    throw new Error("Bu dosya bir Eksperix talep yedeği değil.");
  }
  const gecerli = y.talepler.filter(
    (t): t is Talep => !!t && typeof t.id === "string" && typeof t.talepNo === "string" && Array.isArray(t.tapular),
  );
  if (gecerli.length !== y.talepler.length) throw new Error("Yedek dosyasındaki bazı talepler bozuk.");
  return gecerli;
}

// What restoring would do, for the confirmation step.
export async function yedekOzeti(veri: unknown): Promise<YedekOzeti> {
  const gelen = yedegiDogrula(veri);
  const mevcut = new Set((await listTalepler()).map((t) => t.id));
  const guncellenecek = gelen.filter((t) => mevcut.has(t.id)).length;
  return { yeni: gelen.length - guncellenecek, guncellenecek };
}

// Adds the backup's talepler; ones already here (same id) are replaced by the
// backup's version. Talepler not in the backup are left alone.
export async function yedektenYukle(veri: unknown): Promise<number> {
  const gelen = yedegiDogrula(veri);
  return sirayla(async () => {
    for (const t of gelen) await kaydet(t);
    return gelen.length;
  });
}
