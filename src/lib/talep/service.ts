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
  };
}

function readAll(): Talep[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const talepler = JSON.parse(raw) as Talep[];
    return talepler.map((t) => ({ ...t, tapular: t.tapular.map(normalizeTapu) }));
  } catch {
    return [];
  }
}

function writeAll(talepler: Talep[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(talepler));
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
  return readAll().sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi));
}

export async function getTalep(id: string): Promise<Talep | undefined> {
  return readAll().find((t) => t.id === id);
}

export async function createTalep(input: {
  musteriUnvani: string;
  degerlemeFirmasi: string;
  degerlemeKurumBanka: string;
  tasinmazNiteligi: string;
  tapuSayisi: number;
}): Promise<Talep> {
  const all = readAll();
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
    tapular: Array.from({ length: Math.max(1, input.tapuSayisi) }, (_, i) =>
      createEmptyTapu(i + 1, defaults),
    ),
  };
  writeAll([...all, talep]);
  return talep;
}

export async function deleteTalep(id: string): Promise<void> {
  writeAll(readAll().filter((t) => t.id !== id));
}

export async function addTapu(talepId: string): Promise<Talep | undefined> {
  const all = readAll();
  const talep = all.find((t) => t.id === talepId);
  if (!talep) return undefined;
  talep.tapular.push(
    createEmptyTapu(talep.tapular.length + 1, {
      musteriUnvani: talep.musteriUnvani,
      degerlemeFirmasi: talep.degerlemeFirmasi,
      degerlemeKurumBanka: talep.degerlemeKurumBanka,
      tasinmazNiteligi: talep.tasinmazNiteligi,
    }),
  );
  writeAll(all);
  return talep;
}

export async function removeTapu(talepId: string, tapuId: string): Promise<Talep | undefined> {
  const all = readAll();
  const talep = all.find((t) => t.id === talepId);
  if (!talep) return undefined;
  talep.tapular = talep.tapular.filter((t) => t.id !== tapuId);
  writeAll(all);
  return talep;
}

export async function renameTapu(talepId: string, tapuId: string, ad: string): Promise<Talep | undefined> {
  const all = readAll();
  const talep = all.find((t) => t.id === talepId);
  if (!talep) return undefined;
  talep.tapular = talep.tapular.map((t) => (t.id === tapuId ? { ...t, ad } : t));
  writeAll(all);
  return talep;
}

export async function updateTapu(
  talepId: string,
  tapuId: string,
  updater: (tapu: Tapu) => Tapu,
): Promise<Talep | undefined> {
  const all = readAll();
  const talep = all.find((t) => t.id === talepId);
  if (!talep) return undefined;
  talep.tapular = talep.tapular.map((t) => (t.id === tapuId ? updater(t) : t));
  writeAll(all);
  return talep;
}
