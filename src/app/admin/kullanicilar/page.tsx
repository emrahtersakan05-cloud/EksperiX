import { requireAdmin } from "@/lib/auth/dal";
import { listUsers } from "@/lib/auth/store";
import UsersManager from "@/components/admin/users-manager";

export default async function KullanicilarPage() {
  const currentUser = await requireAdmin();
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Kullanıcı Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sisteme giriş yapacak kullanıcıları oluşturun, rollerini düzenleyin ve şifrelerini sıfırlayın.
        </p>
      </div>
      <UsersManager users={users} currentUserId={currentUser.id} />
    </div>
  );
}
