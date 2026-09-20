"use client";

import html2canvas from "html2canvas";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";
import type { GeneratedValuationReport } from "./report";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPdfContainer(report: GeneratedValuationReport): HTMLDivElement {
  const container = document.createElement("div");
  container.style.width = "760px";
  container.style.padding = "48px";
  container.style.background = "#ffffff";
  container.style.color = "#0f172a";
  container.style.fontFamily = "Arial, Helvetica, sans-serif";
  container.style.lineHeight = "1.65";

  const title = document.createElement("h1");
  title.textContent = report.title;
  title.style.fontSize = "28px";
  title.style.margin = "0 0 24px";
  container.appendChild(title);

  for (const section of report.sections) {
    const heading = document.createElement("h2");
    heading.textContent = section.title;
    heading.style.fontSize = "18px";
    heading.style.margin = "28px 0 12px";
    heading.style.color = "#111827";
    container.appendChild(heading);

    for (const paragraphText of section.paragraphs) {
      const paragraph = document.createElement("p");
      paragraph.textContent = paragraphText;
      paragraph.style.fontSize = "13px";
      paragraph.style.margin = "0 0 12px";
      container.appendChild(paragraph);
    }
  }

  return container;
}

export async function exportReportAsDocx(report: GeneratedValuationReport): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: report.title, bold: true, size: 34 })],
      spacing: { after: 320 },
    }),
  ];

  for (const section of report.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: section.title, bold: true, size: 28 })],
        spacing: { before: 240, after: 120 },
      }),
    );

    for (const paragraphText of section.paragraphs) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: paragraphText, size: 24 })],
          spacing: { after: 160 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${report.fileName}.docx`);
}

export async function exportReportAsPdf(report: GeneratedValuationReport): Promise<void> {
  const container = buildPdfContainer(report);
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imageHeight = (canvas.height * usableWidth) / canvas.width;
    const imageData = canvas.toDataURL("image/png");

    let remainingHeight = imageHeight;
    let offsetY = margin;

    pdf.addImage(imageData, "PNG", margin, offsetY, usableWidth, imageHeight, undefined, "FAST");
    remainingHeight -= usableHeight;

    while (remainingHeight > 0) {
      pdf.addPage();
      offsetY = margin - (imageHeight - remainingHeight);
      pdf.addImage(imageData, "PNG", margin, offsetY, usableWidth, imageHeight, undefined, "FAST");
      remainingHeight -= usableHeight;
    }

    pdf.save(`${report.fileName}.pdf`);
  } finally {
    container.remove();
  }
}
