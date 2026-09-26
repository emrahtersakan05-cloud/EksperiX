import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { EmsalHaritaKaydi } from "./types";

// v1 kept every record in one JSON array under REDIS_KEY and rewrote it on
// each change: two eksperler saving at once lost one of the records (last
// write wins), and the single value grows toward Upstash's request-size
// limit. Records now live one per field of a hash, so writes touch only their
// own record. The v1 key is migrated on first read and left as a backup.
const REDIS_KEY = "eksperix:emsal-haritasi";
const REDIS_HASH = "eksperix:emsal-haritasi:kayitlar";
// Set once the v1 array has been copied, so an emptied hash (every record
// deleted) is never refilled from the old backup.
const TASINDI_ISARETI = "eksperix:emsal-haritasi:v1-tasindi";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "emsaller.json");

// Values pasted into a hosting dashboard often carry stray spaces, newlines or quotes.
const cleanEnv = (value: string | undefined): string | undefined =>
  value?.trim().replace(/^["']+|["']+$/g, "").trim() || undefined;

const redisUrl = cleanEnv(process.env.UPSTASH_REDIS_REST_URL) ?? cleanEnv(process.env.KV_REST_API_URL);
const redisToken = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN) ?? cleanEnv(process.env.KV_REST_API_TOKEN);

// Short, secret-free hint about why the shared store cannot be used (safe to show in the UI).
export function teshisEt(err: unknown): string {
  if (!redisUrl) return "UPSTASH_REDIS_REST_URL tanımlı değil";
  if (!redisToken) return "UPSTASH_REDIS_REST_TOKEN tanımlı değil";
  const message = err instanceof Error ? err.message : String(err);
  if (/NOPERM|not allowed|read.?only/i.test(message)) return "Redis token'ı yazma iznine sahip değil";
  if (/WRONGPASS|unauthorized|invalid token|401/i.test(message)) return "Redis token'ı reddedildi";
  if (/ENOTFOUND|fetch failed|ECONNREFUSED|ETIMEDOUT/i.test(message)) return "Redis adresine ulaşılamadı";
  return `Bağlantı hatası (${err instanceof Error ? err.name : "bilinmeyen"})`;
}

let redisClient: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redisClient === undefined) {
    redisClient = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
  }
  return redisClient;
}

// Every eksper's Emsal Haritası kayıtları must live in one shared place for
// the map/filters to be meaningful (a per-browser localStorage copy would
// leave each user with their own handful of pins). Same requirement as the
// user store, so production without Redis is refused rather than silently
// writing to a serverless instance's throwaway filesystem.
function assertStorageConfigured(): void {
  if (!getRedis() && process.env.NODE_ENV === "production") {
    throw new Error(
      "Emsal Haritası verisi için Redis ayarlanmamış (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).",
    );
  }
}

// One-time copy of the v1 array into the hash. HSET per id is idempotent, so
// two instances migrating at once is harmless.
async function v1Tasi(redis: Redis): Promise<EmsalHaritaKaydi[]> {
  if (await redis.get(TASINDI_ISARETI)) return [];
  const eski = (await redis.get<EmsalHaritaKaydi[]>(REDIS_KEY)) ?? [];
  if (eski.length > 0) {
    await redis.hset(REDIS_HASH, Object.fromEntries(eski.map((r) => [r.id, r])));
  }
  await redis.set(TASINDI_ISARETI, new Date().toISOString());
  return eski;
}

async function readAll(): Promise<EmsalHaritaKaydi[]> {
  assertStorageConfigured();
  const redis = getRedis();
  if (redis) {
    const hepsi = await redis.hgetall<Record<string, EmsalHaritaKaydi>>(REDIS_HASH);
    if (hepsi && Object.keys(hepsi).length > 0) return Object.values(hepsi);
    return v1Tasi(redis);
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as EmsalHaritaKaydi[];
}

// Local-file mode only (development, one user): the whole list is rewritten.
function dosyayaYaz(records: EmsalHaritaKaydi[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
}

// Makes sure a v1 array has been moved into the hash before a single-record
// write, so the first write after deploy doesn't hide the old records.
async function hashHazirla(redis: Redis): Promise<void> {
  if ((await redis.hlen(REDIS_HASH)) === 0) await v1Tasi(redis);
}
// (v1Tasi is a no-op once TASINDI_ISARETI is set, so these checks stay cheap
// reads after the first migration.)

export async function listEmsalKayitlari(): Promise<EmsalHaritaKaydi[]> {
  return (await readAll()).sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi));
}

export async function createEmsalKaydi(
  input: Omit<EmsalHaritaKaydi, "id" | "olusturmaTarihi" | "guncellemeTarihi">,
): Promise<EmsalHaritaKaydi> {
  assertStorageConfigured();
  const now = new Date().toISOString();
  const record: EmsalHaritaKaydi = { ...input, id: randomUUID(), olusturmaTarihi: now, guncellemeTarihi: now };
  const redis = getRedis();
  if (redis) {
    await hashHazirla(redis);
    await redis.hset(REDIS_HASH, { [record.id]: record });
  } else {
    dosyayaYaz([...(await readAll()), record]);
  }
  return record;
}

export async function deleteEmsalKaydi(id: string): Promise<void> {
  assertStorageConfigured();
  const redis = getRedis();
  if (redis) {
    await hashHazirla(redis);
    await redis.hdel(REDIS_HASH, id);
    return;
  }
  dosyayaYaz((await readAll()).filter((r) => r.id !== id));
}

export async function getEmsalKaydi(id: string): Promise<EmsalHaritaKaydi | null> {
  assertStorageConfigured();
  const redis = getRedis();
  if (redis) {
    await hashHazirla(redis);
    return (await redis.hget<EmsalHaritaKaydi>(REDIS_HASH, id)) ?? null;
  }
  return (await readAll()).find((r) => r.id === id) ?? null;
}

// Ownership, provenance and creation fields are never overwritten by an edit.
export type EmsalKaydiGuncelleme = Omit<
  EmsalHaritaKaydi,
  "id" | "kaynak" | "kaynakTalepId" | "kaynakTapuId" | "kaynakSlot" | "ekleyenKullaniciId" | "ekleyenAdSoyad" | "olusturmaTarihi" | "guncellemeTarihi"
>;

export async function updateEmsalKaydi(id: string, changes: EmsalKaydiGuncelleme): Promise<EmsalHaritaKaydi | null> {
  const mevcut = await getEmsalKaydi(id);
  if (!mevcut) return null;
  const updated: EmsalHaritaKaydi = { ...mevcut, ...changes, guncellemeTarihi: new Date().toISOString() };
  const redis = getRedis();
  if (redis) {
    await redis.hset(REDIS_HASH, { [id]: updated });
  } else {
    const all = await readAll();
    dosyayaYaz(all.map((r) => (r.id === id ? updated : r)));
  }
  return updated;
}
