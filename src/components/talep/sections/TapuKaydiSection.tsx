"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  DoorOpen,
  FileText,
  Landmark,
  LandPlot,
  Loader2,
  MapPinned,
  ScrollText,
  Sparkles,
  TriangleAlert,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  RepeatableTable,
  SectionCard,
  TextField,
  tableInputClass,
  type RepeatableTableColumn,
} from "@/components/talep/form-fields";
import { Doluluk, Ozet, OzetBasligi, OzetIzgarasi, Panel } from "@/components/talep/sections/tasarim";
import { extractPdfText, parseTapuKaydiDocument, type ParsedTapuFields } from "@/lib/pdf/tapu-extract";
import { newRowId, type MulkiyetKaydi, type RehinKaydi, type SerhBeyanIrtifak, type TapuKaydiData } from "@/lib/talep/types";

const FormGroup = SectionCard;

function PdfUploadZone({
  value,
  onFileChange,
  onExtract,
  extracting,
  extractStatus,
  extractMessage,
  rawText,
}: {
  value: string;
  onFileChange: (dataUrl: string) => void;
  onExtract: () => void;
  extracting: boolean;
  extractStatus: string;
  extractMessage: { tone: "success" | "warning" | "error"; text: string } | null;
  rawText: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [surukleniyor, setSurukleniyor] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFileChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  const messageTone = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-rose-50 text-rose-700",
  };

  return (
    <FormGroup title="Tapu Belgesi Yükleme Formu" akiciMetin={false}>
      {value ? (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lime-300">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Tapu belgesi yüklendi</p>
            <p className="text-xs text-slate-500">Bilgileri PDF&apos;ten ayıklayıp formu otomatik doldurabilirsiniz.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onFileChange("")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400"
            >
              <X className="h-3.5 w-3.5" />
              Kaldır
            </button>
            <button
              type="button"
              onClick={onExtract}
              disabled={extracting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-lime-300 hover:bg-slate-800 disabled:opacity-60"
            >
              {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {extracting ? extractStatus || "Ayıklanıyor..." : "Bilgileri PDF'ten Ayıkla"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setSurukleniyor(true);
          }}
          onDragLeave={() => setSurukleniyor(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurukleniyor(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
            surukleniyor ? "border-lime-500 bg-lime-50" : "border-slate-200 bg-slate-50/60 hover:border-slate-400"
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-lime-300">
            <Upload className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-slate-800">Tapu belgesini yükleyin</span>
          <span className="text-xs text-slate-500">PDF dosyasını buraya sürükleyin ya da tıklayıp seçin</span>
        </button>
      )}

      {extractMessage && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${messageTone[extractMessage.tone]}`}>{extractMessage.text}</p>
      )}
      {rawText && (
        <button
          type="button"
          onClick={() => setShowRawText((s) => !s)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showRawText ? "rotate-180" : ""}`} />
          Ham PDF metnini {showRawText ? "gizle" : "gör"}
        </button>
      )}
      {rawText && showRawText && (
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] leading-relaxed text-slate-600">
          {rawText}
        </pre>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </FormGroup>
  );
}

const EXTRACT_STATUS_LABELS: Record<string, string> = {
  loading: "Yükleniyor",
  parsing: "Metin ayrıştırılıyor",
};

function getResetTapuKaydiPatch(tapuBelgesiUrl: string): Partial<TapuKaydiData> {
  return {
    tapuBelgesiUrl,
    tarih: "",
    saat: "",
    zeminTipi: "",
    tasinmazKimlikNo: "",
    il: "",
    ilce: "",
    kurumAdi: "",
    mahalleKoyAdi: "",
    mevkii: "",
    cilt: "",
    sayfaNo: "",
    ada: "",
    parsel: "",
    atYuzolcum: "",
    bagimsizBolumNitelik: "",
    bagimsizBolumBrutYuzolcum: "",
    bagimsizBolumNetYuzolcum: "",
    blok: "",
    kat: "",
    giris: "",
    bbNo: "",
    arsaPay: "",
    arsaPayda: "",
    anaTasinmazNitelik: "",
    mulkiyetKayitlari: [],
    serhBeyanIrtifaklar: [],
    rehinler: [],
  };
}

// Single-value fields of the Tapu Kayıt Bilgileri form (for the fill count).
const TAPU_ALANLARI = [
  "tarih",
  "saat",
  "zeminTipi",
  "tasinmazKimlikNo",
  "il",
  "ilce",
  "kurumAdi",
  "mahalleKoyAdi",
  "mevkii",
  "cilt",
  "sayfaNo",
  "ada",
  "parsel",
  "atYuzolcum",
  "bagimsizBolumNitelik",
  "bagimsizBolumBrutYuzolcum",
  "bagimsizBolumNetYuzolcum",
  "blok",
  "kat",
  "giris",
  "bbNo",
  "arsaPay",
  "arsaPayda",
  "anaTasinmazNitelik",
] as const satisfies readonly (keyof TapuKaydiData)[];

const ucSutun = "grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-3";

// Sum of the owners' shares (1 = the whole property), or null without shares.
function hisseToplami(kayitlar: MulkiyetKaydi[]): number | null {
  let toplam = 0;
  let var_ = false;
  for (const k of kayitlar) {
    const pay = Number(k.hissePay.replace(",", "."));
    const payda = Number(k.hissePayda.replace(",", "."));
    if (pay > 0 && payda > 0) {
      toplam += pay / payda;
      var_ = true;
    }
  }
  return var_ ? toplam : null;
}

function hasMulkiyetValue(item: MulkiyetKaydi): boolean {
  return Boolean(
    item.malik.trim() ||
    item.hissePay.trim() ||
    item.hissePayda.trim() ||
    item.metrekare.trim() ||
    item.toplamMetrekare.trim() ||
    item.tarih.trim() ||
    item.yevmiyeNo.trim(),
  );
}

function hasSerhValue(item: SerhBeyanIrtifak): boolean {
  return Boolean(item.turu.trim() || item.aciklama.trim() || item.tarih.trim() || item.yevmiyeNo.trim());
}

function hasRehinValue(item: RehinKaydi): boolean {
  return Boolean(
    item.alacakli.trim() ||
    item.borc.trim() ||
    item.faiz.trim() ||
    item.dereceSira.trim() ||
    item.borcluMalik.trim() ||
    item.tarih.trim() ||
    item.yevmiyeNo.trim(),
  );
}

export default function TapuKaydiSection({
  data,
  onChange,
}: {
  data: TapuKaydiData;
  onChange: (patch: Partial<TapuKaydiData>) => void;
}) {
  const [extracting, setExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState("");
  const [extractMessage, setExtractMessage] = useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);

  function handlePdfFileChange(nextUrl: string) {
    onChange(getResetTapuKaydiPatch(nextUrl));
    setExtractMessage(null);
    setRawText(null);
  }

  async function handleExtract() {
    if (!data.tapuBelgesiUrl || extracting) return;
    setExtracting(true);
    setExtractMessage(null);
    setExtractStatus(EXTRACT_STATUS_LABELS.loading);
    try {
      const text = await extractPdfText(data.tapuBelgesiUrl);
      setRawText(text);
      setExtractStatus(EXTRACT_STATUS_LABELS.parsing);

      const parsed = parseTapuKaydiDocument(text);
      const patch: Partial<TapuKaydiData> = {};
      let filledCount = 0;
      (Object.keys(parsed.fields) as (keyof ParsedTapuFields)[]).forEach((key) => {
        const value = parsed.fields[key];
        if (value) {
          patch[key] = value;
          filledCount += 1;
        }
      });

      // Record tables only auto-fill when still empty — re-running
      // extraction (or extracting after manual edits) must never duplicate
      // or clobber rows the user already has.
      let recordsAdded = 0;
      if (!data.mulkiyetKayitlari.some(hasMulkiyetValue) && parsed.mulkiyetKayitlari.length > 0) {
        patch.mulkiyetKayitlari = parsed.mulkiyetKayitlari;
        recordsAdded += parsed.mulkiyetKayitlari.length;
      }
      if (!data.serhBeyanIrtifaklar.some(hasSerhValue) && parsed.serhBeyanIrtifaklar.length > 0) {
        patch.serhBeyanIrtifaklar = parsed.serhBeyanIrtifaklar;
        recordsAdded += parsed.serhBeyanIrtifaklar.length;
      }
      if (!data.rehinler.some(hasRehinValue) && parsed.rehinler.length > 0) {
        patch.rehinler = parsed.rehinler;
        recordsAdded += parsed.rehinler.length;
      }

      if (filledCount > 0 || recordsAdded > 0) {
        onChange(patch);
        const parts = [
          filledCount > 0 ? `${filledCount} alan` : null,
          recordsAdded > 0 ? `${recordsAdded} kayıt` : null,
        ].filter(Boolean);
        setExtractMessage({
          tone: "success",
          text: `${parts.join(" ve ")} bu belgeden güncellendi. Lütfen doğruluğunu kontrol edin.`,
        });
      } else {
        setExtractMessage({
          tone: "warning",
          text: text.trim().length === 0
            ? "PDF içinden metin okunamadı (taranmış görsel PDF olabilir). Alanları manuel doldurabilirsiniz."
            : "Belgede eşleşen alan bulunamadı. Ham metni inceleyip alanları manuel doldurabilirsiniz.",
        });
      }
    } catch {
      setExtractMessage({
        tone: "error",
        text: "Belge işlenemedi — dosyanın geçerli bir PDF olduğunu kontrol edip tekrar deneyin.",
      });
    } finally {
      setExtracting(false);
      setExtractStatus("");
    }
  }

  const updateMulkiyet = (id: string, patch: Partial<MulkiyetKaydi>) =>
    onChange({
      mulkiyetKayitlari: data.mulkiyetKayitlari.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });

  const updateSerh = (id: string, patch: Partial<SerhBeyanIrtifak>) =>
    onChange({
      serhBeyanIrtifaklar: data.serhBeyanIrtifaklar.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });

  const updateRehin = (id: string, patch: Partial<RehinKaydi>) =>
    onChange({ rehinler: data.rehinler.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const mulkiyetColumns: RepeatableTableColumn<MulkiyetKaydi>[] = [
    {
      key: "malik",
      label: "Malik",
      width: "min-w-40",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.malik}
          onChange={(e) => updateMulkiyet(item.id, { malik: e.target.value })}
        />
      ),
    },
    {
      key: "hissePay",
      label: "Hisse Pay",
      width: "w-24",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.hissePay}
          onChange={(e) => updateMulkiyet(item.id, { hissePay: e.target.value })}
        />
      ),
    },
    {
      key: "hissePayda",
      label: "Hisse Payda",
      width: "w-24",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.hissePayda}
          onChange={(e) => updateMulkiyet(item.id, { hissePayda: e.target.value })}
        />
      ),
    },
    {
      key: "metrekare",
      label: "Metrekare",
      width: "w-28",
      render: (item) => (
        <input
          type="number"
          className={tableInputClass}
          value={item.metrekare}
          onChange={(e) => updateMulkiyet(item.id, { metrekare: e.target.value })}
        />
      ),
    },
    {
      key: "toplamMetrekare",
      label: "Toplam Metrekare",
      width: "w-32",
      render: (item) => (
        <input
          type="number"
          className={tableInputClass}
          value={item.toplamMetrekare}
          onChange={(e) => updateMulkiyet(item.id, { toplamMetrekare: e.target.value })}
        />
      ),
    },
    {
      key: "tarih",
      label: "Tarih",
      width: "w-36",
      render: (item) => (
        <input
          type="date"
          className={tableInputClass}
          value={item.tarih}
          onChange={(e) => updateMulkiyet(item.id, { tarih: e.target.value })}
        />
      ),
    },
    {
      key: "yevmiyeNo",
      label: "Yevmiye No",
      width: "w-28",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.yevmiyeNo}
          onChange={(e) => updateMulkiyet(item.id, { yevmiyeNo: e.target.value })}
        />
      ),
    },
  ];

  const serhColumns: RepeatableTableColumn<SerhBeyanIrtifak>[] = [
    {
      key: "turu",
      label: "Ş/B/İ",
      width: "w-28",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.turu}
          placeholder="Şerh"
          onChange={(e) => updateSerh(item.id, { turu: e.target.value })}
        />
      ),
    },
    {
      key: "aciklama",
      label: "Açıklama",
      width: "min-w-56",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.aciklama}
          onChange={(e) => updateSerh(item.id, { aciklama: e.target.value })}
        />
      ),
    },
    {
      key: "tarih",
      label: "Tarih",
      width: "w-36",
      render: (item) => (
        <input
          type="date"
          className={tableInputClass}
          value={item.tarih}
          onChange={(e) => updateSerh(item.id, { tarih: e.target.value })}
        />
      ),
    },
    {
      key: "yevmiyeNo",
      label: "Yevmiye No",
      width: "w-28",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.yevmiyeNo}
          onChange={(e) => updateSerh(item.id, { yevmiyeNo: e.target.value })}
        />
      ),
    },
  ];

  const rehinColumns: RepeatableTableColumn<RehinKaydi>[] = [
    {
      key: "alacakli",
      label: "Alacaklı",
      width: "min-w-40",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.alacakli}
          onChange={(e) => updateRehin(item.id, { alacakli: e.target.value })}
        />
      ),
    },
    {
      key: "borc",
      label: "Borç",
      width: "w-28",
      render: (item) => (
        <input
          type="number"
          className={tableInputClass}
          value={item.borc}
          onChange={(e) => updateRehin(item.id, { borc: e.target.value })}
        />
      ),
    },
    {
      key: "faiz",
      label: "Faiz",
      width: "w-24",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.faiz}
          onChange={(e) => updateRehin(item.id, { faiz: e.target.value })}
        />
      ),
    },
    {
      key: "dereceSira",
      label: "Derece Sıra",
      width: "w-28",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.dereceSira}
          onChange={(e) => updateRehin(item.id, { dereceSira: e.target.value })}
        />
      ),
    },
    {
      key: "borcluMalik",
      label: "Borçlu Malik",
      width: "min-w-40",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.borcluMalik}
          onChange={(e) => updateRehin(item.id, { borcluMalik: e.target.value })}
        />
      ),
    },
    {
      key: "tarih",
      label: "Tarih",
      width: "w-36",
      render: (item) => (
        <input
          type="date"
          className={tableInputClass}
          value={item.tarih}
          onChange={(e) => updateRehin(item.id, { tarih: e.target.value })}
        />
      ),
    },
    {
      key: "yevmiyeNo",
      label: "Yevmiye No",
      width: "w-28",
      render: (item) => (
        <input
          className={tableInputClass}
          value={item.yevmiyeNo}
          onChange={(e) => updateRehin(item.id, { yevmiyeNo: e.target.value })}
        />
      ),
    },
  ];

  const alanDegerleri = TAPU_ALANLARI.map((k) => data[k]);
  const doluAlan = alanDegerleri.filter((v) => v.trim()).length;
  const malikSayisi = data.mulkiyetKayitlari.filter(hasMulkiyetValue).length;
  const serhSayisi = data.serhBeyanIrtifaklar.filter(hasSerhValue).length;
  const rehinSayisi = data.rehinler.filter(hasRehinValue).length;
  const hisse = hisseToplami(data.mulkiyetKayitlari);
  const yer = [data.il, data.ilce, data.mahalleKoyAdi].filter(Boolean).join(" / ");

  return (
    <div className="space-y-4">
      <OzetBasligi
        etiket="Tapu Özeti"
        ikon={<Landmark className="h-3.5 w-3.5" />}
        baslik={yer || "Tapu bilgisi girilmedi"}
        bos={!yer}
        altBaslik={
          [
            (data.ada || data.parsel) && `${data.ada || "—"} ada ${data.parsel || "—"} parsel`,
            data.mevkii && `${data.mevkii} mevkii`,
            data.tasinmazKimlikNo && `TKN ${data.tasinmazKimlikNo}`,
          ]
            .filter(Boolean)
            .join(" · ") || "Ada, parsel ve kimlik numarası yok"
        }
        alt={
          <>
            <Doluluk dolu={doluAlan} toplam={TAPU_ALANLARI.length} />
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {malikSayisi} malik
            </span>
            {hisse !== null && (
              <span className={Math.abs(hisse - 1) < 0.0001 ? "text-emerald-300" : "text-amber-300"}>
                Hisse toplamı {Math.abs(hisse - 1) < 0.0001 ? "tam (1/1)" : `%${(hisse * 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`}
              </span>
            )}
            <span>{serhSayisi} şerh / beyan / irtifak</span>
            <span className={rehinSayisi > 0 ? "inline-flex items-center gap-1 text-amber-300" : ""}>
              {rehinSayisi > 0 && <TriangleAlert className="h-3 w-3" />}
              {rehinSayisi} rehin
            </span>
          </>
        }
      >
        <OzetIzgarasi>
          <Ozet etiket="Ana Taşınmaz Nitelik" deger={data.anaTasinmazNitelik} />
          <Ozet etiket="Bağımsız Bölüm" deger={data.bagimsizBolumNitelik} />
          <Ozet
            etiket="Brüt / Net"
            deger={[data.bagimsizBolumBrutYuzolcum, data.bagimsizBolumNetYuzolcum].filter(Boolean).join(" / ")}
            birim="m²"
          />
          <Ozet
            etiket="Blok · Kat · BB"
            deger={[data.blok && `${data.blok} Blok`, data.kat && `${data.kat}. Kat`, data.bbNo && `BB ${data.bbNo}`]
              .filter(Boolean)
              .join(" · ")}
          />
          <Ozet etiket="Arsa Payı" deger={data.arsaPay || data.arsaPayda ? `${data.arsaPay || "—"}/${data.arsaPayda || "—"}` : ""} />
        </OzetIzgarasi>
      </OzetBasligi>

      <PdfUploadZone
        value={data.tapuBelgesiUrl}
        onFileChange={handlePdfFileChange}
        onExtract={handleExtract}
        extracting={extracting}
        extractStatus={extractStatus}
        extractMessage={extractMessage}
        rawText={rawText}
      />

      <FormGroup title="Tapu Kayıt Bilgileri Formu">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel baslik="Kayıt" icon={<ScrollText className="h-3.5 w-3.5" />}>
            <div className={ucSutun}>
              <TextField label="Tarih" type="date" value={data.tarih} onChange={(v) => onChange({ tarih: v })} />
              <TextField label="Saat" type="time" value={data.saat} onChange={(v) => onChange({ saat: v })} />
              <TextField label="Zemin Tipi" value={data.zeminTipi} onChange={(v) => onChange({ zeminTipi: v })} />
              <TextField
                label="Taşınmaz Kimlik No"
                value={data.tasinmazKimlikNo}
                onChange={(v) => onChange({ tasinmazKimlikNo: v })}
              />
              <TextField label="Cilt" value={data.cilt} onChange={(v) => onChange({ cilt: v })} />
              <TextField label="Sayfa No" value={data.sayfaNo} onChange={(v) => onChange({ sayfaNo: v })} />
            </div>
          </Panel>

          <Panel baslik="Konum" icon={<MapPinned className="h-3.5 w-3.5" />}>
            <div className={ucSutun}>
              <TextField label="İl" value={data.il} onChange={(v) => onChange({ il: v })} />
              <TextField label="İlçe" value={data.ilce} onChange={(v) => onChange({ ilce: v })} />
              <TextField label="Kurum Adı" value={data.kurumAdi} onChange={(v) => onChange({ kurumAdi: v })} />
              <TextField
                label="Mahalle / Köy Adı"
                value={data.mahalleKoyAdi}
                onChange={(v) => onChange({ mahalleKoyAdi: v })}
                className="sm:col-span-2"
              />
              <TextField label="Mevkii" value={data.mevkii} onChange={(v) => onChange({ mevkii: v })} />
            </div>
          </Panel>

          <Panel baslik="Ana Taşınmaz" icon={<LandPlot className="h-3.5 w-3.5" />}>
            <div className={ucSutun}>
              <TextField label="Ada" value={data.ada} onChange={(v) => onChange({ ada: v })} />
              <TextField label="Parsel" value={data.parsel} onChange={(v) => onChange({ parsel: v })} />
              <TextField
                label="AT Yüzölçüm (m²)"
                type="number"
                value={data.atYuzolcum}
                onChange={(v) => onChange({ atYuzolcum: v })}
              />
              <TextField
                label="Ana Taşınmaz Nitelik"
                value={data.anaTasinmazNitelik}
                onChange={(v) => onChange({ anaTasinmazNitelik: v })}
                className="sm:col-span-3"
              />
            </div>
          </Panel>

          <Panel baslik="Bağımsız Bölüm" icon={<DoorOpen className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
              <TextField
                label="Nitelik"
                value={data.bagimsizBolumNitelik}
                onChange={(v) => onChange({ bagimsizBolumNitelik: v })}
                className="col-span-2"
              />
              <TextField
                label="Brüt (m²)"
                type="number"
                value={data.bagimsizBolumBrutYuzolcum}
                onChange={(v) => onChange({ bagimsizBolumBrutYuzolcum: v })}
              />
              <TextField
                label="Net (m²)"
                type="number"
                value={data.bagimsizBolumNetYuzolcum}
                onChange={(v) => onChange({ bagimsizBolumNetYuzolcum: v })}
              />
              <TextField label="Blok" value={data.blok} onChange={(v) => onChange({ blok: v })} />
              <TextField label="Kat" value={data.kat} onChange={(v) => onChange({ kat: v })} />
              <TextField label="Giriş" value={data.giris} onChange={(v) => onChange({ giris: v })} />
              <TextField label="BBNo" value={data.bbNo} onChange={(v) => onChange({ bbNo: v })} />
              <TextField label="Arsa Pay" value={data.arsaPay} onChange={(v) => onChange({ arsaPay: v })} />
              <TextField label="Arsa Payda" value={data.arsaPayda} onChange={(v) => onChange({ arsaPayda: v })} />
            </div>
          </Panel>
        </div>
      </FormGroup>

      <FormGroup title="Tapu Mülkiyet Bilgileri Formu">
        <RepeatableTable
          items={data.mulkiyetKayitlari}
          columns={mulkiyetColumns}
          addLabel="Mülkiyet Kaydı Ekle"
          emptyLabel="Henüz mülkiyet kaydı eklenmedi."
          onAdd={() =>
            onChange({
              mulkiyetKayitlari: [
                ...data.mulkiyetKayitlari,
                {
                  id: newRowId(),
                  malik: "",
                  hissePay: "",
                  hissePayda: "",
                  metrekare: "",
                  toplamMetrekare: "",
                  tarih: "",
                  yevmiyeNo: "",
                },
              ],
            })
          }
          onRemove={(id) =>
            onChange({ mulkiyetKayitlari: data.mulkiyetKayitlari.filter((m) => m.id !== id) })
          }
        />
      </FormGroup>

      <FormGroup title="Taşınmaza Ait Şerh / Beyan / İrtifak Bilgileri Formu">
        <RepeatableTable
          items={data.serhBeyanIrtifaklar}
          columns={serhColumns}
          addLabel="Şerh / Beyan / İrtifak Ekle"
          emptyLabel="Şerh, beyan veya irtifak kaydı yok."
          onAdd={() =>
            onChange({
              serhBeyanIrtifaklar: [
                ...data.serhBeyanIrtifaklar,
                { id: newRowId(), turu: "", aciklama: "", tarih: "", yevmiyeNo: "" },
              ],
            })
          }
          onRemove={(id) =>
            onChange({ serhBeyanIrtifaklar: data.serhBeyanIrtifaklar.filter((s) => s.id !== id) })
          }
        />
      </FormGroup>

      <FormGroup title="Taşınmaza Ait Rehin Bilgileri Formu">
        <RepeatableTable
          items={data.rehinler}
          columns={rehinColumns}
          addLabel="Rehin Kaydı Ekle"
          emptyLabel="Henüz rehin kaydı eklenmedi."
          onAdd={() =>
            onChange({
              rehinler: [
                ...data.rehinler,
                {
                  id: newRowId(),
                  alacakli: "",
                  borc: "",
                  faiz: "",
                  dereceSira: "",
                  borcluMalik: "",
                  tarih: "",
                  yevmiyeNo: "",
                },
              ],
            })
          }
          onRemove={(id) => onChange({ rehinler: data.rehinler.filter((r) => r.id !== id) })}
        />
      </FormGroup>
    </div>
  );
}
