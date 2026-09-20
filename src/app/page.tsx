import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileText,
  Map,
  Puzzle,
  ScanLine,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Talep Yönetimi",
    description:
      "Değerleme taleplerinizi oluşturun, tapu sayısına göre otomatik numaralandırın ve süreci uçtan uca takip edin.",
  },
  {
    icon: ScanLine,
    title: "Otomatik Belge Okuma",
    description:
      "Tapu ve UAVT belgelerindeki bilgileri OCR ve PDF ayrıştırma ile otomatik olarak forma aktarın.",
  },
  {
    icon: FileText,
    title: "Profesyonel Raporlama",
    description:
      "SPK standartlarına uygun değerleme raporlarını Word ve PDF formatında tek tıkla oluşturun.",
  },
  {
    icon: Map,
    title: "Değer Haritası",
    description:
      "Bölgesel emsal ve değerleme verilerini interaktif harita üzerinde görselleştirin, karşılaştırın.",
  },
  {
    icon: Puzzle,
    title: "Araç Entegrasyonları",
    description:
      "Tarayıcı eklentisi, faydalı bağlantılar ve resim düzenleme araçlarıyla iş akışınızı hızlandırın.",
  },
  {
    icon: Users,
    title: "Kullanıcı ve Yetki Yönetimi",
    description:
      "Yöneticiler; eksper hesaplarını merkezi panelden oluşturur, rollerini ve erişimlerini yönetir.",
  },
];

const steps = [
  {
    no: "01",
    title: "Talep Oluşturun",
    description: "Müşteri, kurum ve taşınmaz bilgilerini girerek yeni bir değerleme talebi açın.",
  },
  {
    no: "02",
    title: "Belgeleri Aktarın",
    description: "Tapu kaydı, imar durumu ve kurum incelemelerini otomatik okuma ile hızlıca doldurun.",
  },
  {
    no: "03",
    title: "Analiz ve Değerleme",
    description: "Emsal verileri ve değer haritasını kullanarak değerleme sonucunu oluşturun.",
  },
  {
    no: "04",
    title: "Raporu Teslim Edin",
    description: "Hazırlanan raporu Word/PDF olarak dışa aktarın ve ilgili kuruma iletin.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-300 text-sm font-bold text-slate-900 shadow-[0_0_24px_-4px] shadow-lime-400/70">
              EX
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">Eksperix</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#ozellikler" className="hover:text-slate-900">
              Özellikler
            </a>
            <a href="#nasil-calisir" className="hover:text-slate-900">
              Nasıl Çalışır
            </a>
            <a href="#guvenlik" className="hover:text-slate-900">
              Güvenlik
            </a>
          </nav>

          <Link
            href="/giris"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-lime-300 transition hover:bg-slate-800"
          >
            Giriş Yap
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-lime-300">
              SPK Gayrimenkul Değerleme Platformu
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Değerleme süreçlerinizi tek platformda yönetin
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400">
              Eksperix; talep takibinden belge okumaya, değer haritasından rapor
              oluşturmaya kadar gayrimenkul değerleme sürecinin tamamını dijitalleştirir.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/giris"
                className="flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_0_24px_-4px] shadow-lime-400/60 transition hover:bg-lime-200"
              >
                Giriş Yap
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#ozellikler"
                className="rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5"
              >
                Özellikleri İncele
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center gap-1.5 pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Toplam Talep", value: "48", accent: "text-blue-300" },
                  { label: "Bekleyen Talep", value: "24", accent: "text-amber-300" },
                  { label: "Tamamlanan", value: "12", accent: "text-emerald-300" },
                  { label: "Ort. Süre (gün)", value: "6", accent: "text-violet-300" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/5 p-4">
                    <p className={`text-2xl font-semibold ${stat.accent}`}>{stat.value}</p>
                    <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2 rounded-xl bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Firma Bazlı Değerleme Rapor Grafiği</span>
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="flex h-16 items-end gap-1.5">
                  {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="flex-1 rounded-t bg-lime-300/70"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ozellikler" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Tek platformda her şey</h2>
          <p className="mt-3 text-slate-500">
            Eksperler ve yöneticiler için tasarlanmış araçlarla değerleme sürecinizin tamamını yönetin.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-12px_rgba(15,23,42,0.12)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
                  <Icon className="h-5 w-5 text-lime-300" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="nasil-calisir" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Nasıl çalışır?</h2>
            <p className="mt-3 text-slate-500">
              Talep açılışından raporun teslimine kadar dört adımda tamamlanan bir süreç.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.no} className="relative rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <span className="text-3xl font-bold text-lime-300">{step.no}</span>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="guvenlik" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-12 rounded-2xl bg-slate-900 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-300">
              <ShieldCheck className="h-5 w-5 text-slate-900" />
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">
              Güvenli, rol tabanlı erişim
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              Kullanıcı hesapları yalnızca yöneticiler tarafından oluşturulur. Şifreler
              güvenli biçimde saklanır ve her kullanıcı yalnızca rolüne tanımlı
              sayfalara erişebilir.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              "Kullanıcı adı ve şifre ile korumalı giriş",
              "Yönetici onaylı hesap oluşturma ve rol atama",
              "Oturumların şifrelenmiş, güvenli çerezlerle yönetimi",
              "Yöneticiye özel kullanıcı yönetimi paneli",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-300/20 text-lime-300">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-100 bg-white/90 px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Hesabınızla giriş yaparak devam edin
          </h2>
          <p className="max-w-md text-sm text-slate-500">
            Hesabınız yoksa sistem yöneticinizden Eksperix üzerinde bir kullanıcı hesabı
            oluşturmasını isteyin.
          </p>
          <Link
            href="/giris"
            className="flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_0_24px_-4px] shadow-lime-400/60 transition hover:bg-lime-200"
          >
            Giriş Yap
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-lime-300">
              EX
            </div>
            <span>Eksperix Değerleme Platformu</span>
          </div>
          <span>© {new Date().getFullYear()} Eksperix. Tüm hakları saklıdır.</span>
        </div>
      </footer>
    </div>
  );
}
