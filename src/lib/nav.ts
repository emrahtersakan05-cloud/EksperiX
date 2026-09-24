import {
  Home,
  ClipboardList,
  FileText,
  Map,
  Wrench,
  ImageIcon,
  Link2,
  FolderOpen,
  Puzzle,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavLeaf {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
}

export type NavItem = NavLeaf | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const extraPageTitles: Record<string, string> = {
  "/deger-haritasi/emsal-haritasi": "Emsal Haritası",
  "/deger-haritasi/emsal-haritasi/yeni": "Yeni Emsal",
  "/deger-haritasi/deger-haritasi": "Değer Haritası",
};

export function getPageTitle(pathname: string): string {
  for (const item of navItems) {
    if (isNavGroup(item)) {
      const child = item.children.find((c) => c.href === pathname);
      if (child) return child.label;
    } else if (item.href === pathname) {
      return item.label;
    }
  }
  if (/^\/deger-haritasi\/emsal-haritasi\/[^/]+\/duzenle$/.test(pathname)) return "Emsali Düzenle";
  return extraPageTitles[pathname] ?? "Eksperix";
}

export const navItems: NavItem[] = [
  { label: "Ana Sayfa", href: "/panel", icon: Home },
  { label: "Taleplerim", href: "/taleplerim", icon: ClipboardList },
  { label: "Raporlarım", href: "/raporlarim", icon: FileText },
  { label: "Değer Haritası", href: "/deger-haritasi", icon: Map },
  {
    label: "Araçlarım",
    icon: Wrench,
    children: [
      { label: "Resim Düzenleme", href: "/araclarim/resim-duzenleme", icon: ImageIcon },
      { label: "Önemli Bağlantılar", href: "/araclarim/onemli-baglantilar", icon: Link2 },
      { label: "Faydalı Dosyalar", href: "/araclarim/faydali-dosyalar", icon: FolderOpen },
      { label: "Uygulama Eklentileri", href: "/araclarim/uygulama-eklentileri", icon: Puzzle },
    ],
  },
  { label: "Kullanıcı Yönetimi", href: "/admin/kullanicilar", icon: Users, adminOnly: true },
];
