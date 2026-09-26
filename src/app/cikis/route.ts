import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";

// Clears the session cookie and sends the user to the login page. Used by the
// root layout when a still-valid session belongs to a user who no longer
// exists (deleted by an admin) — a server component can't delete cookies.
export async function GET(request: Request) {
  await deleteSession();
  return NextResponse.redirect(new URL("/giris", request.url));
}
