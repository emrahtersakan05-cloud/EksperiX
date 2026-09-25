import { redirect } from "next/navigation";
import HesapFormlari from "@/components/hesabim/HesapFormlari";
import { getCurrentUser } from "@/lib/auth/dal";

export default async function HesabimPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hesabım</h1>
        <p className="mt-1 text-sm text-slate-500">
          Profil bilgilerinizi ve şifrenizi güncelleyin. Hesap oluşturulma tarihi:{" "}
          {new Date(user.createdAt).toLocaleDateString("tr-TR")}.
        </p>
      </div>
      <HesapFormlari user={user} />
    </div>
  );
}
