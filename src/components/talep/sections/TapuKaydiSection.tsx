"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileText, Sparkles, Upload, X } from "lucide-react";
import {
  RepeatableTable,
  SectionCard,
  sectionBodyClass,
  TextField,
  tableInputClass,
  type RepeatableTableColumn,
} from "@/components/talep/form-fields";
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
    <FormGroup
      title="Tapu Belgesi Yükleme Formu"
      className="flex h-full flex-col overflow-hidden border-sky-400/80 bg-gradient-to-br from-sky-200 via-cyan-100 to-emerald-200 shadow-[0_16px_36px_-24px_rgba(2,132,199,0.75)]"
    >
      {value ? (
        <div className={`${sectionBodyClass} flex-1 border-sky-300/80 bg-white/85`}>
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-sky-700 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-white uppercase">
            <FileText className="h-3 w-3" />
            Resmi Belge
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-800 text-white">
              <FileText className="h-5 w-5" />
            </span>
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="text-xs font-medium text-slate-800">Yüklenen Tapu Belgesi (PDF)</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={onExtract}
                  disabled={extracting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-800 to-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {extracting ? extractStatus || "Ayıklanıyor..." : "Bilgileri PDF'ten Ayıkla"}
                </button>
                <button
                  type="button"
                  onClick={() => onFileChange("")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-[11px] font-medium text-sky-800 hover:bg-sky-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Kaldır
                </button>
              </div>
              {extractMessage && (
                <p className={`rounded-lg px-3 py-2 text-xs ${messageTone[extractMessage.tone]}`}>
                  {extractMessage.text}
                </p>
              )}
              {rawText && (
                <button
                  type="button"
                  onClick={() => setShowRawText((s) => !s)}
                  className="inline-flex items-center gap-1 self-start text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showRawText ? "rotate-180" : ""}`} />
                  Ham PDF metnini {showRawText ? "gizle" : "gör"}
                </button>
              )}
            </div>
          </div>
          {rawText && showRawText && (
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap text-slate-600">
              {rawText}
            </pre>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-500 bg-gradient-to-br from-sky-200 via-cyan-100 to-emerald-200 py-5 text-center transition-colors hover:border-sky-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-800 text-white">
            <Upload className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-slate-800">Tapu Belgesi Yükle</span>
          <span className="text-[11px] text-sky-900/75">PDF dosyası seçin</span>
        </button>
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

  return (
    <div className="space-y-4">
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
        <div className={`${sectionBodyClass} grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-4`}>
          <TextField label="Tarih" type="date" value={data.tarih} onChange={(v) => onChange({ tarih: v })} />
          <TextField label="Saat" type="time" value={data.saat} onChange={(v) => onChange({ saat: v })} />
          <TextField label="Zemin Tipi" value={data.zeminTipi} onChange={(v) => onChange({ zeminTipi: v })} />
          <TextField
            label="Taşınmaz Kimlik No"
            value={data.tasinmazKimlikNo}
            onChange={(v) => onChange({ tasinmazKimlikNo: v })}
          />
          <TextField label="İl" value={data.il} onChange={(v) => onChange({ il: v })} />
          <TextField label="İlçe" value={data.ilce} onChange={(v) => onChange({ ilce: v })} />
          <TextField label="Kurum Adı" value={data.kurumAdi} onChange={(v) => onChange({ kurumAdi: v })} />
          <TextField
            label="Mahalle / Köy Adı"
            value={data.mahalleKoyAdi}
            onChange={(v) => onChange({ mahalleKoyAdi: v })}
          />
          <TextField label="Mevkii" value={data.mevkii} onChange={(v) => onChange({ mevkii: v })} />
          <TextField label="Cilt" value={data.cilt} onChange={(v) => onChange({ cilt: v })} />
          <TextField label="Sayfa No" value={data.sayfaNo} onChange={(v) => onChange({ sayfaNo: v })} />
          <TextField label="Ada" value={data.ada} onChange={(v) => onChange({ ada: v })} />
          <TextField label="Parsel" value={data.parsel} onChange={(v) => onChange({ parsel: v })} />
          <TextField
            label="AT Yüzölçüm (m²)"
            type="number"
            value={data.atYuzolcum}
            onChange={(v) => onChange({ atYuzolcum: v })}
          />
          <TextField
            label="Bağımsız Bölüm Nitelik"
            value={data.bagimsizBolumNitelik}
            onChange={(v) => onChange({ bagimsizBolumNitelik: v })}
          />
          <TextField
            label="Bağımsız Bölüm Brüt Yüzölçümü"
            type="number"
            value={data.bagimsizBolumBrutYuzolcum}
            onChange={(v) => onChange({ bagimsizBolumBrutYuzolcum: v })}
          />
          <TextField
            label="Bağımsız Bölüm Net Yüzölçümü"
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
          <TextField
            label="Ana Taşınmaz Nitelik"
            value={data.anaTasinmazNitelik}
            onChange={(v) => onChange({ anaTasinmazNitelik: v })}
          />
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
