import {
  BarChart3,
  Building2,
  Calculator,
  DoorOpen,
  FileCheck2,
  FileText,
  Globe,
  Info,
  Landmark,
  Layers,
  Map,
  MapPin,
  ScrollText,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { TapuSectionKey } from "./types";

export interface SectionLeaf {
  key: TapuSectionKey;
  label: string;
  icon: LucideIcon;
}

export interface SectionGroup {
  label: string;
  icon: LucideIcon;
  children: SectionLeaf[];
}

export type SectionItem = SectionLeaf | SectionGroup;

export function isSectionGroup(item: SectionItem): item is SectionGroup {
  return "children" in item;
}

export const sectionItems: SectionItem[] = [
  {
    label: "Genel Bilgiler",
    icon: Info,
    children: [
      { key: "talepDetayi", label: "Talep Detayı", icon: FileText },
      { key: "adresKonum", label: "Adres / Konum", icon: MapPin },
      { key: "tapuKaydi", label: "Tapu Kaydı", icon: ScrollText },
    ],
  },
  {
    label: "Kurum İncelemeleri",
    icon: Landmark,
    children: [
      { key: "kurumIncelemeleri", label: "Ruhsat İncelemeleri", icon: Landmark },
      { key: "projeIncelemeleri", label: "Proje İncelemeleri", icon: FileText },
      { key: "imarDurumu", label: "İmar Durumu", icon: Map },
    ],
  },
  {
    label: "Özellikler",
    icon: Layers,
    children: [
      { key: "anaGayrimenkul", label: "Ana Gayrimenkul", icon: Building2 },
      { key: "bagimsizBolum", label: "Bağımsız Bölüm", icon: DoorOpen },
    ],
  },
  { key: "degerleme", label: "Değerleme", icon: Calculator },
  {
    label: "Araştırma",
    icon: Search,
    children: [
      { key: "emsaller", label: "Emsal Girişleri", icon: BarChart3 },
      { key: "yakinRaporlarAdaParsel", label: "Yakın Raporlar (Ada/Parsel)", icon: FileText },
      { key: "yakinRaporlarHarita", label: "Yakın Raporlar (Harita)", icon: Map },
      { key: "emlakSitesiIlanlari", label: "Emlak Sitesi İlanları", icon: Globe },
    ],
  },
  { key: "raporSonucu", label: "Rapor Sonucu", icon: FileCheck2 },
];

// Flat view of every leaf section, regardless of grouping — used to look up
// a section's own label/icon by key (e.g. the active section's card title).
export const sectionMeta: SectionLeaf[] = sectionItems.flatMap((item) =>
  isSectionGroup(item) ? item.children : [item],
);
