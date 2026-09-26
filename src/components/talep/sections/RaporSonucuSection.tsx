"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Sparkles } from "lucide-react";
import {
  SectionCard,
  SectionGrid,
  SelectField,
  TextAreaField,
  TextField,
  helperTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/talep/form-fields";
import { exportReportAsDocx, exportReportAsPdf } from "@/lib/talep/report-export";
import { raporDurumOptions } from "@/lib/talep/options";
import { generateValuationReport, type GeneratedValuationReport } from "@/lib/talep/report";
import type { RaporSonucuData, Talep, Tapu } from "@/lib/talep/types";

export default function RaporSonucuSection({
  data,
  talep,
  tapu,
  onChange,
}: {
  data: RaporSonucuData;
  talep: Talep;
  tapu: Tapu;
  onChange: (patch: Partial<RaporSonucuData>) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportingType, setExportingType] = useState<"docx" | "pdf" | null>(null);

  const generatedReport = useMemo(
    () => generateValuationReport({ talep, tapu }),
    [talep, tapu],
  );

  function getGeneratedReport(): GeneratedValuationReport {
    return generatedReport;
  }

  function getExportableReport(): GeneratedValuationReport {
    const generated = getGeneratedReport();
    const reportText = data.raporMetni.trim();

    if (!reportText) {
      return {
        ...generated,
        executiveSummary: data.yoneticiOzeti.trim() || generated.executiveSummary,
        valuationConclusion: data.degerTakdirSonucu.trim() || generated.valuationConclusion,
      };
    }

    return {
      ...generated,
      executiveSummary: data.yoneticiOzeti.trim() || generated.executiveSummary,
      valuationConclusion: data.degerTakdirSonucu.trim() || generated.valuationConclusion,
      fullReport: reportText,
      sections: [
        {
          title: generated.title,
          paragraphs: reportText
            .split(/\n+/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean),
        },
      ],
    };
  }

  function handleGenerateReport() {
    setIsGenerating(true);
    try {
      const generated = getGeneratedReport();
      onChange({
        yoneticiOzeti: generated.executiveSummary,
        degerTakdirSonucu: generated.valuationConclusion,
        raporMetni: generated.fullReport,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExport(type: "docx" | "pdf") {
    setExportingType(type);
    try {
      const report = getExportableReport();
      if (type === "docx") {
        await exportReportAsDocx(report);
      } else {
        await exportReportAsPdf(report);
      }
    } finally {
      setExportingType(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Otomatik Değerleme Raporu</p>
            <p className="text-sm text-slate-500">
              Diğer sekmelerdeki kayıtlı veriler akıcı rapor metnine dönüştürülür ve Word ile PDF olarak dışa aktarılır.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleGenerateReport} className={primaryButtonClass} disabled={isGenerating}>
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Rapor Oluşturuluyor..." : "Raporu Otomatik Oluştur"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("docx")}
              className={secondaryButtonClass}
              disabled={exportingType !== null}
            >
              <FileText className="h-4 w-4" />
              {exportingType === "docx" ? "Word Hazırlanıyor..." : "Word İndir"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className={secondaryButtonClass}
              disabled={exportingType !== null}
            >
              <Download className="h-4 w-4" />
              {exportingType === "pdf" ? "PDF Hazırlanıyor..." : "PDF İndir"}
            </button>
          </div>
        </div>
        <span className={helperTextClass}>
          İndir butonları mevcut metni esas alır; rapor metni boşsa güncel form verilerinden anlık rapor üretir.
        </span>
      </div>

      <SectionGrid>
        <TextField label="Rapor No" value={data.raporNo} onChange={(v) => onChange({ raporNo: v })} />
        <TextField label="Versiyon" value={data.versiyon} onChange={(v) => onChange({ versiyon: v })} />
        <SelectField
          label="Durum"
          value={data.durum}
          options={raporDurumOptions}
          onChange={(v) => onChange({ durum: v })}
        />
        <TextField
          label="Teslim Tarihi"
          type="date"
          value={data.teslimTarihi}
          onChange={(v) => onChange({ teslimTarihi: v })}
        />
        <TextAreaField
          label="Yönetici Özeti"
          value={data.yoneticiOzeti}
          onChange={(v) => onChange({ yoneticiOzeti: v })}
          className="sm:col-span-2"
        />
        <TextAreaField
          label="Değer Takdiri Sonucu"
          value={data.degerTakdirSonucu}
          onChange={(v) => onChange({ degerTakdirSonucu: v })}
          className="sm:col-span-2"
        />
      </SectionGrid>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Sekme Bazlı Rapor Görünümü</p>
          <p className="text-sm text-slate-500">
            Tüm sekmeler menü sırasıyla gösterilir; her bölümün hangi sekmeden üretildiği belirtilir. Verisi henüz
            girilmemiş sekmeler rapora eklenmez.
          </p>
        </div>

        <div className="space-y-3">
          {generatedReport.tumSekmeler.map((section) => {
            const bos = section.paragraphs.length === 0;
            return (
              <SectionCard key={section.title} title={section.title} className="h-full">
                {section.source && <p className="-mt-1 mb-3 text-xs text-slate-400">Kaynak: {section.source}</p>}
                {bos ? (
                  <p className="text-sm text-slate-400">Bu sekmede henüz veri girilmedi.</p>
                ) : (
                  <div className="space-y-3">
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.title}-${index}`} className="text-sm leading-6 text-slate-600">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </SectionCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
