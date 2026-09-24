import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { EmsalHaritaKaydi } from "./types";

const REDIS_KEY = "eksperix:emsal-haritasi";
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

async function readAll(): Promise<EmsalHaritaKaydi[]> {
  assertStorageConfigured();
  const redis = getRedis();
  if (redis) {
    return (await redis.get<EmsalHaritaKaydi[]>(REDIS_KEY)) ?? [];
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as EmsalHaritaKaydi[];
}

async function writeAll(records: EmsalHaritaKaydi[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, records);
    return;
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export async function listEmsalKayitlari(): Promise<EmsalHaritaKaydi[]> {
  return (await readAll()).sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi));
}

export async function createEmsalKaydi(
  input: Omit<EmsalHaritaKaydi, "id" | "olusturmaTarihi" | "guncellemeTarihi">,
): Promise<EmsalHaritaKaydi> {
  const all = await readAll();
  const now = new Date().toISOString();
  const record: EmsalHaritaKaydi = { ...input, id: randomUUID(), olusturmaTarihi: now, guncellemeTarihi: now };
  await writeAll([...all, record]);
  return record;
}

export async function deleteEmsalKaydi(id: string): Promise<void> {
  await writeAll((await readAll()).filter((r) => r.id !== id));
}
