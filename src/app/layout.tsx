import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/dal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eksperix",
  description: "SPK gayrimenkul değerleme platformu",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
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
