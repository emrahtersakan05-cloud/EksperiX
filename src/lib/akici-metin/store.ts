import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

// Akıcı metin templates are written by the Sistem Yöneticisi and used by
// every eksper, so they live on the server: one hash field per form title
// holding that form's template texts in order.
const REDIS_HASH = "eksperix:akici-metin:sablonlar";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "akici-metin-sablonlari.json");

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

// Same rule as the other shared stores: production without Redis would
// write to a serverless instance's throwaway disk, so it is refused.
function depoHazirMi(): void {
  if (!getRedis() && process.env.NODE_ENV === "production") {
    throw new Error("Şablonlar için Redis ayarlanmamış (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).");
  }
}

function dosyaOku(): Record<string, string[]> {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Record<string, string[]>;
  } catch {
    return {};
  }
}

function dosyayaYaz(veri: Record<string, string[]>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(veri, null, 2), "utf8");
}

// null: the form has no saved templates (the client builds defaults).
export async function sablonlariGetir(baslik: string): Promise<string[] | null> {
  depoHazirMi();
  const redis = getRedis();
  if (redis) return (await redis.hget<string[]>(REDIS_HASH, baslik)) ?? null;
  return dosyaOku()[baslik] ?? null;
}

// null clears the form's templates back to the defaults.
export async function sablonlariKaydet(baslik: string, metinler: string[] | null): Promise<void> {
  depoHazirMi();
  const redis = getRedis();
  if (redis) {
    if (metinler === null) await redis.hdel(REDIS_HASH, baslik);
    else await redis.hset(REDIS_HASH, { [baslik]: metinler });
    return;
  }
  const veri = dosyaOku();
  if (metinler === null) delete veri[baslik];
  else veri[baslik] = metinler;
  dosyayaYaz(veri);
}
