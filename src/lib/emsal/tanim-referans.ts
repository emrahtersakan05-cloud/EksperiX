// Persistent option lists for the "Tanım 1" / "Tanım 2" selects of the Emsal
// Akıcı Metin Açıklaması. Same localStorage pattern as arazi-referans, but the
// order is meaningful (Tanım 2 runs from better to worse), so lists are kept in
// insertion order instead of being sorted alphabetically.
const STORAGE_KEY = "eksperix_emsal_tanim_referans_v1";

const tanim1Seed = ["Değerleme konusu taşınmaz ile aynı bölgede,", "Aynı mevkide,"];
const tanim2Seed = ["daha iyi konumda", "kısmen benzer konumda,", "benzer konumda,", "kısmen kötü konumda,"];

export type TanimKey = "tanim1" | "tanim2";

type TanimStore = Record<TanimKey, string[]>;

function emptyStore(): TanimStore {
  return { tanim1: [...tanim1Seed], tanim2: [...tanim2Seed] };
}

function readStore(): TanimStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<TanimStore>;
    return {
      tanim1: parsed.tanim1?.length ? parsed.tanim1 : [...tanim1Seed],
      tanim2: parsed.tanim2?.length ? parsed.tanim2 : [...tanim2Seed],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: TanimStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked: the option still works for this session.
  }
}

const sameLabel = (a: string, b: string) => a.localeCompare(b, "tr", { sensitivity: "base" }) === 0;

export async function getTanimlar(key: TanimKey): Promise<string[]> {
  return readStore()[key];
}

export async function addTanim(key: TanimKey, value: string): Promise<string[]> {
  const store = readStore();
  const trimmed = value.trim();
  if (trimmed && !store[key].some((item) => sameLabel(item, trimmed))) store[key] = [...store[key], trimmed];
  writeStore(store);
  return store[key];
}

export async function removeTanim(key: TanimKey, value: string): Promise<string[]> {
  const store = readStore();
  store[key] = store[key].filter((item) => !sameLabel(item, value));
  writeStore(store);
  return store[key];
}
