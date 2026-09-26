import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Redis } from "@upstash/redis";
import type { PublicUser, Role, StoredUser } from "./types";

const REDIS_KEY = "eksperix:users";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

// Values pasted into a hosting dashboard often carry stray spaces, newlines or quotes.
const cleanEnv = (value: string | undefined): string | undefined =>
  value?.trim().replace(/^["']+|["']+$/g, "").trim() || undefined;

const redisUrl = cleanEnv(process.env.UPSTASH_REDIS_REST_URL) ?? cleanEnv(process.env.KV_REST_API_URL);
const redisToken = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN) ?? cleanEnv(process.env.KV_REST_API_TOKEN);

// Short, secret-free hint about why the user store cannot be used (safe to show on the login page).
export function teshisEt(err: unknown): string {
  if (!redisUrl) return "UPSTASH_REDIS_REST_URL tanımlı değil";
  if (!redisToken) return "UPSTASH_REDIS_REST_TOKEN tanımlı değil";
  if (!/^https:\/\/[^\s/]+\.[^\s/]+/.test(redisUrl) || redisUrl.includes("...")) {
    const kaynak = cleanEnv(process.env.UPSTASH_REDIS_REST_URL) ? "UPSTASH_REDIS_REST_URL" : "KV_REST_API_URL";
    const sema = redisUrl.match(/^[a-z]+:\/\//i)?.[0] ?? "şema yok";
    const ozellikler = [
      `başlangıç: ${sema}`,
      `uzunluk: ${redisUrl.length}`,
      redisUrl.includes("...") ? "'...' içeriyor" : "",
      /:\d+/.test(redisUrl.replace(/^[a-z]+:\/\//i, "")) ? "port içeriyor" : "",
      redisUrl.includes("upstash.io") ? "upstash.io içeriyor" : "upstash.io içermiyor",
    ].filter(Boolean);
    return `${kaynak} geçersiz: https:// ile başlayan REST URL olmalı (Redis bağlantı adresi değil) [${ozellikler.join(", ")}]`;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/ADMIN_PASSWORD/.test(message)) return "ADMIN_PASSWORD tanımlı değil";
  if (/NOPERM|not allowed|read.?only/i.test(message)) return "Redis token'ı yazma iznine sahip değil (Read-Only olmayan token gerekli)";
  if (/WRONGPASS|unauthorized|invalid token|401/i.test(message)) return "Redis token'ı reddedildi (yanlış ya da yenilenmiş token)";
  if (/ENOTFOUND|fetch failed|ECONNREFUSED|ETIMEDOUT/i.test(message)) return "Redis adresine ulaşılamadı (URL yanlış ya da veritabanı silinmiş)";
  return `Bağlantı hatası (${err instanceof Error ? err.name : "bilinmeyen"})`;
}

let redisClient: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redisClient === undefined) {
    redisClient = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
  }
  return redisClient;
}

function assertStorageConfigured(): void {
  if (!getRedis() && process.env.NODE_ENV === "production") {
    throw new Error(
      "Kullanıcı verisi için Redis ayarlanmamış (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).",
    );
  }
}

function seedAdmin(): StoredUser {
  const password =
    process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "admin123");
  if (!password) {
    throw new Error("İlk yönetici hesabı için ADMIN_PASSWORD ortam değişkeni tanımlı değil.");
  }
  return {
    id: randomUUID(),
    username: "admin",
    passwordHash: bcrypt.hashSync(password, 10),
    fullName: "Sistem Yöneticisi",
    email: "admin@eksperix.local",
    role: "admin",
    createdAt: new Date().toISOString(),
  };
}

async function readAll(): Promise<StoredUser[]> {
  assertStorageConfigured();
  const redis = getRedis();
  if (redis) {
    const existing = await redis.get<StoredUser[]>(REDIS_KEY);
    if (existing && existing.length > 0) return existing;
    const seeded = [seedAdmin()];
    await redis.set(REDIS_KEY, seeded);
    return seeded;
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify([seedAdmin()], null, 2), "utf-8");
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as StoredUser[];
}

async function writeAll(users: StoredUser[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, users);
    return;
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function toPublic(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function listUsers(): Promise<PublicUser[]> {
  return (await readAll())
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toPublic);
}

export async function findByUsername(username: string): Promise<StoredUser | undefined> {
  return (await readAll()).find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function findById(id: string): Promise<StoredUser | undefined> {
  return (await readAll()).find((u) => u.id === id);
}

// Compared against when the username doesn't exist, so an unknown username
// takes as long as a wrong password and response time can't reveal which
// usernames are registered.
let bosHash: string | undefined;

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<StoredUser | null> {
  const user = await findByUsername(username);
  if (!user) {
    bosHash ??= bcrypt.hashSync("eksperix-yok", 10);
    bcrypt.compareSync(password, bosHash);
    return null;
  }
  return bcrypt.compareSync(password, user.passwordHash) ? user : null;
}

// ---- Login throttling -------------------------------------------------------
// Failed attempts per username; after GIRIS_SINIRI failures within the window
// the username is locked until the window expires. Redis when configured (so
// all serverless instances share the count), otherwise in memory.

export const GIRIS_SINIRI = 8;
const GIRIS_PENCERESI_SN = 15 * 60;
const bellekDenemeleri = new Map<string, { adet: number; bitis: number }>();

const denemeAnahtari = (username: string) => `eksperix:giris-deneme:${username.trim().toLowerCase()}`;

// Seconds until the lock lifts, or 0 when the username may try.
export async function girisKilitSuresi(username: string): Promise<number> {
  const redis = getRedis();
  const anahtar = denemeAnahtari(username);
  if (redis) {
    const adet = (await redis.get<number>(anahtar)) ?? 0;
    if (adet < GIRIS_SINIRI) return 0;
    return Math.max(1, await redis.ttl(anahtar));
  }
  const kayit = bellekDenemeleri.get(anahtar);
  if (!kayit || kayit.bitis <= Date.now()) return 0;
  return kayit.adet >= GIRIS_SINIRI ? Math.ceil((kayit.bitis - Date.now()) / 1000) : 0;
}

export async function hataliGirisKaydet(username: string): Promise<void> {
  const redis = getRedis();
  const anahtar = denemeAnahtari(username);
  if (redis) {
    const adet = await redis.incr(anahtar);
    if (adet === 1) await redis.expire(anahtar, GIRIS_PENCERESI_SN);
    return;
  }
  const simdi = Date.now();
  const kayit = bellekDenemeleri.get(anahtar);
  if (!kayit || kayit.bitis <= simdi) bellekDenemeleri.set(anahtar, { adet: 1, bitis: simdi + GIRIS_PENCERESI_SN * 1000 });
  else kayit.adet += 1;
}

export async function girisDenemeleriniSifirla(username: string): Promise<void> {
  const redis = getRedis();
  const anahtar = denemeAnahtari(username);
  if (redis) await redis.del(anahtar);
  else bellekDenemeleri.delete(anahtar);
}

export async function createUser(input: {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: Role;
}): Promise<PublicUser> {
  const all = await readAll();
  if (all.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
    throw new Error("Bu kullanıcı adı zaten kullanılıyor.");
  }
  const user: StoredUser = {
    id: randomUUID(),
    username: input.username,
    passwordHash: bcrypt.hashSync(input.password, 10),
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  await writeAll([...all, user]);
  return toPublic(user);
}

export async function updateUser(
  id: string,
  patch: Partial<{ fullName: string; email: string; role: Role }>,
): Promise<PublicUser | undefined> {
  const all = await readAll();
  const idx = all.findIndex((u) => u.id === id);
  if (idx === -1) return undefined;
  // Never leave the system without an admin (nobody could manage users then).
  if (patch.role && patch.role !== "admin" && all[idx].role === "admin" && all.filter((u) => u.role === "admin").length === 1) {
    throw new Error("Sistemde en az bir yönetici kalmalı; son yöneticinin rolü değiştirilemez.");
  }
  all[idx] = { ...all[idx], ...patch };
  await writeAll(all);
  return toPublic(all[idx]);
}

// Returns the user's new session version (see StoredUser.oturumSurumu).
export async function resetPassword(id: string, newPassword: string): Promise<number | undefined> {
  const all = await readAll();
  const idx = all.findIndex((u) => u.id === id);
  if (idx === -1) return undefined;
  const oturumSurumu = (all[idx].oturumSurumu ?? 0) + 1;
  all[idx] = { ...all[idx], passwordHash: bcrypt.hashSync(newPassword, 10), oturumSurumu };
  await writeAll(all);
  return oturumSurumu;
}

export async function deleteUser(id: string): Promise<void> {
  const all = await readAll();
  const hedef = all.find((u) => u.id === id);
  if (hedef?.role === "admin" && all.filter((u) => u.role === "admin").length === 1) {
    throw new Error("Son yönetici silinemez.");
  }
  await writeAll(all.filter((u) => u.id !== id));
}
