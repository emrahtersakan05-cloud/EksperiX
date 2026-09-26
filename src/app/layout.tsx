import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/app-shell";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSessionPayload } from "@/lib/auth/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eksperix",
  description: "SPK gayrimenkul değerleme platformu",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, session] = await Promise.all([getCurrentUser(), getSessionPayload()]);
  // A signed session outlives its user (7-day token): once an admin deletes
  // the account, end the session instead of letting it browse on.
  if (session?.userId && !user) redirect("/cikis");
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="h-full bg-slate-50">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
