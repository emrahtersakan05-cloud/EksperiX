export type Role = "admin" | "eksper";

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
}

export type PublicUser = Omit<StoredUser, "passwordHash">;

export interface SessionPayload {
  userId: string;
  username: string;
  role: Role;
  expiresAt: string;
  [key: string]: unknown;
}
