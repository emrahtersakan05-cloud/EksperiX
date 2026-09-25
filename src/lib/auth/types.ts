export type Role = "admin" | "eksper";

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
  // Bumped on every password change / reset; sessions signed with an older
  // value stop working, so a changed password logs out other devices.
  oturumSurumu?: number;
}

export type PublicUser = Omit<StoredUser, "passwordHash" | "oturumSurumu">;

export interface SessionPayload {
  userId: string;
  username: string;
  role: Role;
  expiresAt: string;
  surum?: number;
  [key: string]: unknown;
}
