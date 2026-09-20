const STORAGE_KEY = "eksperix_adres_referans_v1";

export const ilSeed = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kilis",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Şanlıurfa",
  "Şırnak",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak",
];

interface AdresReferansStore {
  iller: string[];
  ilceler: Record<string, string[]>;
  mahalleler: Record<string, string[]>;
  koyler: Record<string, string[]>;
}

function emptyStore(): AdresReferansStore {
  return { iller: [...ilSeed], ilceler: {}, mahalleler: {}, koyler: {} };
}

function readStore(): AdresReferansStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<AdresReferansStore>;
    return {
      iller: parsed.iller?.length ? parsed.iller : [...ilSeed],
      ilceler: parsed.ilceler ?? {},
      mahalleler: parsed.mahalleler ?? {},
      koyler: parsed.koyler ?? {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: AdresReferansStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function sortTr(list: string[]): string[] {
  return [...list].sort((a, b) => a.localeCompare(b, "tr"));
}

function ilceKey(il: string, ilce: string): string {
  return `${il}||${ilce}`;
}

function addUnique(list: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const exists = list.some((item) => item.localeCompare(trimmed, "tr", { sensitivity: "base" }) === 0);
  return exists ? list : sortTr([...list, trimmed]);
}

function removeValue(list: string[], value: string): string[] {
  return list.filter((item) => item.localeCompare(value, "tr", { sensitivity: "base" }) !== 0);
}

// Async so this module can later be swapped for a real reference-data API.

export async function getIller(): Promise<string[]> {
  return sortTr(readStore().iller);
}

export async function getIlceler(il: string): Promise<string[]> {
  return sortTr(readStore().ilceler[il] ?? []);
}

export async function getMahalleler(il: string, ilce: string): Promise<string[]> {
  return sortTr(readStore().mahalleler[ilceKey(il, ilce)] ?? []);
}

export async function getKoyler(il: string, ilce: string): Promise<string[]> {
  return sortTr(readStore().koyler[ilceKey(il, ilce)] ?? []);
}

export async function addIl(il: string): Promise<string[]> {
  const store = readStore();
  store.iller = addUnique(store.iller, il);
  writeStore(store);
  return sortTr(store.iller);
}

export async function addIlce(il: string, ilce: string): Promise<string[]> {
  const store = readStore();
  store.ilceler[il] = addUnique(store.ilceler[il] ?? [], ilce);
  writeStore(store);
  return sortTr(store.ilceler[il]);
}

export async function addMahalle(il: string, ilce: string, mahalle: string): Promise<string[]> {
  const store = readStore();
  const key = ilceKey(il, ilce);
  store.mahalleler[key] = addUnique(store.mahalleler[key] ?? [], mahalle);
  writeStore(store);
  return sortTr(store.mahalleler[key]);
}

export async function addKoy(il: string, ilce: string, koy: string): Promise<string[]> {
  const store = readStore();
  const key = ilceKey(il, ilce);
  store.koyler[key] = addUnique(store.koyler[key] ?? [], koy);
  writeStore(store);
  return sortTr(store.koyler[key]);
}

export async function removeIl(il: string): Promise<string[]> {
  const store = readStore();
  store.iller = removeValue(store.iller, il);
  writeStore(store);
  return sortTr(store.iller);
}

export async function removeIlce(il: string, ilce: string): Promise<string[]> {
  const store = readStore();
  store.ilceler[il] = removeValue(store.ilceler[il] ?? [], ilce);
  writeStore(store);
  return sortTr(store.ilceler[il]);
}

export async function removeMahalle(il: string, ilce: string, mahalle: string): Promise<string[]> {
  const store = readStore();
  const key = ilceKey(il, ilce);
  store.mahalleler[key] = removeValue(store.mahalleler[key] ?? [], mahalle);
  writeStore(store);
  return sortTr(store.mahalleler[key]);
}

export async function removeKoy(il: string, ilce: string, koy: string): Promise<string[]> {
  const store = readStore();
  const key = ilceKey(il, ilce);
  store.koyler[key] = removeValue(store.koyler[key] ?? [], koy);
  writeStore(store);
  return sortTr(store.koyler[key]);
}
