const STORAGE_KEY = "eksperix_arazi_referans_v1";

const araziSekliSeed = ["Dikdörtgen", "Üçgen", "Şekilsiz", "Diğer"];
const araziYapisiSeed = ["Düz", "Az Eğimli", "Çok Eğimli", "Engebeli", "Diğer"];
const sulamaImkaniSeed = ["Var", "Yok", "Diğer"];

interface AraziReferansStore {
  araziSekilleri: string[];
  araziYapilari: string[];
  sulamaImkanlari: string[];
}

function emptyStore(): AraziReferansStore {
  return {
    araziSekilleri: [...araziSekliSeed],
    araziYapilari: [...araziYapisiSeed],
    sulamaImkanlari: [...sulamaImkaniSeed],
  };
}

function readStore(): AraziReferansStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<AraziReferansStore>;
    return {
      araziSekilleri: parsed.araziSekilleri?.length ? parsed.araziSekilleri : [...araziSekliSeed],
      araziYapilari: parsed.araziYapilari?.length ? parsed.araziYapilari : [...araziYapisiSeed],
      sulamaImkanlari: parsed.sulamaImkanlari?.length ? parsed.sulamaImkanlari : [...sulamaImkaniSeed],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: AraziReferansStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function sortTr(list: string[]): string[] {
  // "Diğer" listenin sonunda sabit kalır, geri kalanı alfabetik sıralanır.
  const digerIndex = list.findIndex((item) => item.localeCompare("Diğer", "tr", { sensitivity: "base" }) === 0);
  const rest = digerIndex === -1 ? list : list.filter((_, i) => i !== digerIndex);
  const sorted = [...rest].sort((a, b) => a.localeCompare(b, "tr"));
  return digerIndex === -1 ? sorted : [...sorted, list[digerIndex]];
}

function addUnique(list: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return sortTr(list);
  const exists = list.some((item) => item.localeCompare(trimmed, "tr", { sensitivity: "base" }) === 0);
  return exists ? sortTr(list) : sortTr([...list, trimmed]);
}

function removeValue(list: string[], value: string): string[] {
  return list.filter((item) => item.localeCompare(value, "tr", { sensitivity: "base" }) !== 0);
}

export async function getAraziSekilleri(): Promise<string[]> {
  return sortTr(readStore().araziSekilleri);
}

export async function addAraziSekli(value: string): Promise<string[]> {
  const store = readStore();
  store.araziSekilleri = addUnique(store.araziSekilleri, value);
  writeStore(store);
  return sortTr(store.araziSekilleri);
}

export async function removeAraziSekli(value: string): Promise<string[]> {
  const store = readStore();
  store.araziSekilleri = removeValue(store.araziSekilleri, value);
  writeStore(store);
  return sortTr(store.araziSekilleri);
}

export async function getAraziYapilari(): Promise<string[]> {
  return sortTr(readStore().araziYapilari);
}

export async function addAraziYapisi(value: string): Promise<string[]> {
  const store = readStore();
  store.araziYapilari = addUnique(store.araziYapilari, value);
  writeStore(store);
  return sortTr(store.araziYapilari);
}

export async function removeAraziYapisi(value: string): Promise<string[]> {
  const store = readStore();
  store.araziYapilari = removeValue(store.araziYapilari, value);
  writeStore(store);
  return sortTr(store.araziYapilari);
}

export async function getSulamaImkanlari(): Promise<string[]> {
  return sortTr(readStore().sulamaImkanlari);
}

export async function addSulamaImkani(value: string): Promise<string[]> {
  const store = readStore();
  store.sulamaImkanlari = addUnique(store.sulamaImkanlari, value);
  writeStore(store);
  return sortTr(store.sulamaImkanlari);
}

export async function removeSulamaImkani(value: string): Promise<string[]> {
  const store = readStore();
  store.sulamaImkanlari = removeValue(store.sulamaImkanlari, value);
  writeStore(store);
  return sortTr(store.sulamaImkanlari);
}
