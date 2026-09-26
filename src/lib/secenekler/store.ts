import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

// Admin-maintained option lists, shared by every user: one hash field per
// list key holding its options in order.
const REDIS_HASH = "eksperix:secenek-listeleri";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "secenek-listeleri.json");

const cleanEnv = (value: string | undefined): string | undefined =>
  value?.trim().replace(/^["']+|["']+$/g, "").trim() || undefined;

const redisUrl = cleanEnv(process.env.UPSTASH_REDIS_REST_URL) ?? cleanEnv(process.env.KV_REST_API_URL);
const redisToken = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN) ?? cleanEnv(process.env.KV_REST_API_TOKEN);

let redisClient: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redisClient === undefined) {
    redisClient = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
  }
  return redisClient;
}

function depoHazirMi(): void {
  if (!getRedis() && process.env.NODE_ENV === "production") {
    throw new Error("Seçenek listeleri için Redis ayarlanmamış (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).");
  }
}

function dosyaOku(): Record<string, string[]> {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Record<string, string[]>;
  } catch {
    return {};
  }
}

// Only lists an admin has changed are stored; the rest use their defaults.
export async function tumListeleriGetir(): Promise<Record<string, string[]>> {
  depoHazirMi();
  const redis = getRedis();
  if (redis) return (await redis.hgetall<Record<string, string[]>>(REDIS_HASH)) ?? {};
  return dosyaOku();
}

export async function listeKaydet(key: string, secenekler: string[] | null): Promise<void> {
  depoHazirMi();
  const redis = getRedis();
  if (redis) {
    if (secenekler === null) await redis.hdel(REDIS_HASH, key);
    else await redis.hset(REDIS_HASH, { [key]: secenekler });
    return;
  }
  const veri = dosyaOku();
  if (secenekler === null) delete veri[key];
  else veri[key] = secenekler;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(veri, null, 2), "utf8");
}
