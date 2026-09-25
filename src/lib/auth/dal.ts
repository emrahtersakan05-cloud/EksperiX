import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionPayload } from "./session";
import { findById } from "./store";
import type { PublicUser, SessionPayload } from "./types";

// The session's user, or null when the user is gone or the session predates
// their last password change.
async function oturumKullanicisi(session: SessionPayload) {
  const user = await findById(session.userId);
  if (!user || (session.surum ?? 0) !== (user.oturumSurumu ?? 0)) return undefined;
  return user;
}

function toPublic(user: Awaited<ReturnType<typeof findById>>): PublicUser | null {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSessionPayload();
  if (!session?.userId) {
    redirect("/giris");
  }
  return session;
});

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await getSessionPayload();
  if (!session?.userId) return null;
  return toPublic(await oturumKullanicisi(session));
});

export async function requireAdmin(): Promise<PublicUser> {
  const session = await verifySession();
  const user = toPublic(await oturumKullanicisi(session));
  if (!user || user.role !== "admin") {
    redirect("/panel");
  }
  return user;
}
