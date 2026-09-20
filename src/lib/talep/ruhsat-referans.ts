import { normalizeLabel } from "@/lib/text/normalize-tr";
import { ilSeed } from "./adres-referans";

const STORAGE_KEY = "eksperix_ruhsat_referans_v1";
const KURUM_KAYNAK_URL =
  "https://raw.githubusercontent.com/emrtnm/turkiye-il-ilce-veritabani/main/postgresql.sql";
const KURUM_KAYNAK_CACHE_MS = 1000 * 60 * 60 * 24 * 30;

const belgeCinsiSeed = [
  "Yapı Ruhsatı",
  "Yapı Kullanma İzin Belgesi",
  "Mimari Proje Onayı",
  "Statik Proje Onayı",
  "Elektrik Projesi Onayı",
  "Mekanik Proje Onayı",
  "Tadilat Ruhsatı",
  "Onaylı Vaziyet Planı",
  "İskan Belgesi",
  "Numarataj Belgesi",
];

interface RuhsatReferansStore {
  belgeCinsleri: string[];
  kurumKaynak?: KurumKaynakData;
}

interface KurumKaynakData {
  cities: string[];
  districtsByCity: Record<string, string[]>;
  fetchedAt: number;
  sourceUrl: string;
}

function emptyStore(): RuhsatReferansStore {
  return { belgeCinsleri: [...belgeCinsiSeed] };
}

function readStore(): RuhsatReferansStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<RuhsatReferansStore>;
    return {
      belgeCinsleri: parsed.belgeCinsleri?.length ? parsed.belgeCinsleri : [...belgeCinsiSeed],
      kurumKaynak: parsed.kurumKaynak,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: RuhsatReferansStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function sortTr(list: string[]): string[] {
  return [...list].sort((a, b) => a.localeCompare(b, "tr"));
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

const cityAliases: Record<string, string> = {
  icel: "Mersin",
  mersin: "Mersin",
  elazig: "Elazığ",
  hakkari: "Hakkari",
};

let kurumKaynakPromise: Promise<KurumKaynakData> | null = null;

function canonicalizeCityName(city: string, knownCities: readonly string[]): string {
  const normalized = normalizeLabel(city);
  const alias = cityAliases[normalized];
  if (alias) return alias;
  return knownCities.find((item) => normalizeLabel(item) === normalized) ?? city.trim();
}

function isKurumKaynakFresh(value?: KurumKaynakData): value is KurumKaynakData {
  return Boolean(value?.cities.length && value?.fetchedAt && Date.now() - value.fetchedAt < KURUM_KAYNAK_CACHE_MS);
}

function buildFallbackKurumKaynak(): KurumKaynakData {
  return {
    cities: sortTr(ilSeed),
    districtsByCity: {},
    fetchedAt: 0,
    sourceUrl: KURUM_KAYNAK_URL,
  };
}

function pushUnique(list: string[], value: string) {
  if (!value) return;
  if (list.some((item) => item.localeCompare(value, "tr", { sensitivity: "base" }) === 0)) return;
  list.push(value);
}

function parseKurumKaynak(sqlText: string): KurumKaynakData {
  const cityIdToName = new Map<string, string>();
  const cities: string[] = [];
  const districtsByCity: Record<string, string[]> = {};

  const cityPattern = /INSERT INTO public\.cities \(id, name\) VALUES \((\d+), '([^']+)'\);/g;
  const districtPattern = /INSERT INTO public\.districts \(city_id, id, name\) VALUES \((\d+), \d+, '([^']+)'\);/g;

  for (const match of sqlText.matchAll(cityPattern)) {
    const [, id, rawName] = match;
    const cityName = canonicalizeCityName(rawName, ilSeed);
    cityIdToName.set(id, cityName);
    pushUnique(cities, cityName);
    districtsByCity[cityName] ??= [];
  }

  for (const match of sqlText.matchAll(districtPattern)) {
    const [, cityId, districtName] = match;
    const cityName = cityIdToName.get(cityId);
    if (!cityName) continue;
    pushUnique(districtsByCity[cityName], districtName.trim());
  }

  return {
    cities: sortTr(cities),
    districtsByCity: Object.fromEntries(
      Object.entries(districtsByCity).map(([cityName, districts]) => [cityName, sortTr(districts)]),
    ),
    fetchedAt: Date.now(),
    sourceUrl: KURUM_KAYNAK_URL,
  };
}

async function getKurumKaynak(): Promise<KurumKaynakData> {
  const store = readStore();
  if (isKurumKaynakFresh(store.kurumKaynak)) return store.kurumKaynak;
  if (kurumKaynakPromise) return kurumKaynakPromise;

  kurumKaynakPromise = fetch(KURUM_KAYNAK_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Kurum kaynağı alınamadı: ${response.status}`);
      return parseKurumKaynak(await response.text());
    })
    .then((kurumKaynak) => {
      const nextStore = readStore();
      nextStore.kurumKaynak = kurumKaynak;
      writeStore(nextStore);
      return kurumKaynak;
    })
    .catch(() => store.kurumKaynak ?? buildFallbackKurumKaynak())
    .finally(() => {
      kurumKaynakPromise = null;
    });

  return kurumKaynakPromise;
}

function buildInstitutionsForCity(city: string, districts: readonly string[]): string[] {
  const institutions = [
    `${city} Valiliği`,
    `${city} Belediyesi`,
    `${city} Çevre, Şehircilik ve İklim Değişikliği İl Müdürlüğü`,
    `${city} Tapu ve Kadastro Bölge Müdürlüğü`,
  ];

  for (const district of districts) {
    if (normalizeLabel(district) !== "merkez") {
      institutions.push(`${district} Belediyesi`);
    }
    institutions.push(
      `${district} Kaymakamlığı`,
      `${district} Tapu Müdürlüğü`,
      `${district} Kadastro Müdürlüğü`,
      `${district} İmar ve Şehircilik Müdürlüğü`,
      `${district} Ruhsat ve Denetim Müdürlüğü`,
    );
  }

  return institutions;
}

export async function getRuhsatKurumlari(city?: string, district?: string): Promise<string[]> {
  const kurumKaynak = await getKurumKaynak();
  const scopedCity = city?.trim() ? canonicalizeCityName(city, kurumKaynak.cities) : "";
  const districtsForCity = scopedCity ? kurumKaynak.districtsByCity[scopedCity] ?? [] : [];
  const scopedDistrict =
    district?.trim() && districtsForCity.length
      ? districtsForCity.find((item) => normalizeLabel(item) === normalizeLabel(district.trim()))
      : undefined;

  const scopedCities = scopedCity ? [scopedCity] : kurumKaynak.cities;
  const institutions = scopedCities.flatMap((cityName) =>
    buildInstitutionsForCity(
      cityName,
      cityName === scopedCity
        ? scopedDistrict
          ? [scopedDistrict]
          : districtsForCity
        : [],
    ),
  );

  return sortTr(
    institutions.filter((value, index, values) => values.findIndex((item) => item === value) === index),
  );
}

export async function getBelgeCinsleri(): Promise<string[]> {
  return sortTr(readStore().belgeCinsleri);
}

export async function addBelgeCinsi(value: string): Promise<string[]> {
  const store = readStore();
  store.belgeCinsleri = addUnique(store.belgeCinsleri, value);
  writeStore(store);
  return sortTr(store.belgeCinsleri);
}

export async function removeBelgeCinsi(value: string): Promise<string[]> {
  const store = readStore();
  store.belgeCinsleri = removeValue(store.belgeCinsleri, value);
  writeStore(store);
  return sortTr(store.belgeCinsleri);
}
