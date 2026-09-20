export const talepTuruOptions = ["İpotek", "Satış", "Miras", "Dava", "Sigorta", "Diğer"] as const;
export type TalepTuru = (typeof talepTuruOptions)[number];

export const oncelikOptions = ["Düşük", "Normal", "Yüksek", "Acil"] as const;
export type Oncelik = (typeof oncelikOptions)[number];

export const kurumIncelemeDurumOptions = ["Bekliyor", "Tamamlandı", "Olumsuz"] as const;
export type KurumIncelemeDurum = (typeof kurumIncelemeDurumOptions)[number];

export const evetHayirOptions = ["Evet", "Hayır"] as const;
export type EvetHayir = (typeof evetHayirOptions)[number];

export const binaTuruOptions = ["Konut", "İşyeri", "Karma", "Sanayi", "Arsa"] as const;
export type BinaTuru = (typeof binaTuruOptions)[number];

export const genelDurumOptions = ["Çok İyi", "İyi", "Orta", "Kötü", "Harap"] as const;
export type GenelDurum = (typeof genelDurumOptions)[number];

export const iskanDurumuOptions = ["Var", "Yok", "Belirtilmemiş"] as const;
export type IskanDurumu = (typeof iskanDurumuOptions)[number];

export const kullanimSekliOptions = ["Mesken", "İşyeri", "Depo", "Ofis", "Diğer"] as const;
export type KullanimSekli = (typeof kullanimSekliOptions)[number];

export const isitmaTipiOptions = [
  "Kombi (Doğalgaz)",
  "Merkezi",
  "Kat Kaloriferi",
  "Klima",
  "Soba",
  "Yok",
] as const;
export type IsitmaTipi = (typeof isitmaTipiOptions)[number];

export const degerlemeDurumOptions = ["Taslak", "İncelemede", "Onaylandı"] as const;
export type DegerlemeDurum = (typeof degerlemeDurumOptions)[number];

export const finalDegerKaynakOptions = ["Deterministik", "AI Önerisi", "Uzman Override"] as const;
export type FinalDegerKaynak = (typeof finalDegerKaynakOptions)[number];

export const raporDurumOptions = ["Taslak", "İncelemede", "Onaylandı", "Teslim Edildi"] as const;
export type RaporDurum = (typeof raporDurumOptions)[number];
