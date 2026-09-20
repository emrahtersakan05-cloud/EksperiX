import { newRowId } from "@/lib/talep/types";

// Reusable flowing-text drafts for "Emsaller ile İlgili Diğer Açıklamalar".
// Same localStorage pattern as tanim-referans: shared across all talepler and
// persisted on every change.
const STORAGE_KEY = "eksperix_emsal_aciklama_taslaklari_v1";

export interface AciklamaTaslak {
  id: string;
  baslik: string;
  metin: string;
}

function readAll(): AciklamaTaslak[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AciklamaTaslak[];
    return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.id === "string") : [];
  } catch {
    return [];
  }
}

function writeAll(taslaklar: AciklamaTaslak[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(taslaklar));
  } catch {
    // Storage full or blocked: the change still applies for this session.
  }
}

export async function listTaslaklar(): Promise<AciklamaTaslak[]> {
  return readAll();
}

// Creates a new draft when `id` is omitted, otherwise updates the existing one.
export async function saveTaslak(input: { id?: string; baslik: string; metin: string }): Promise<AciklamaTaslak[]> {
  const all = readAll();
  const baslik = input.baslik.trim();
  const metin = input.metin.trim();
  if (!baslik || !metin) return all;

  const next = input.id
    ? all.map((t) => (t.id === input.id ? { ...t, baslik, metin } : t))
    : [...all, { id: newRowId(), baslik, metin }];
  writeAll(next);
  return next;
}

export async function removeTaslak(id: string): Promise<AciklamaTaslak[]> {
  const next = readAll().filter((t) => t.id !== id);
  writeAll(next);
  return next;
}
