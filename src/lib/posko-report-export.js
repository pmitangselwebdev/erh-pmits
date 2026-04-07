import fs from "fs";
import path from "path";
import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { POSKO_REPORT_TYPES } from "@/lib/constants";

// ─── Styling constants ────────────────────────────────────────────────────────
const RED = "C0392B";
const WHITE = "FFFFFF";
const NORMAL = 20; // 10 pt (half-points)
const HEADING_PT = 24; // 12 pt

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function toInt(value) {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

function formatRupiah(value) {
  const n = toInt(value);
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function extractSnapshot(report) {
  const snapshot = report?.payloadSnapshot && typeof report.payloadSnapshot === "object"
    ? report.payloadSnapshot
    : {};

  const extra = snapshot.extra && typeof snapshot.extra === "object" ? snapshot.extra : {};

  return {
    incidents: toArray(snapshot.incidents),
    ambulanceRequests: toArray(snapshot.ambulanceRequests),
    generatedBy: snapshot.generatedBy || report.createdBy?.fullName || "-",
    extra,
  };
}

function buildTemplateData(report) {
  const snapshot = extractSnapshot(report);
  const incidents = snapshot.incidents;
  const requests = snapshot.ambulanceRequests;

  const incidentRows = incidents.map((item, index) => ({
    no: index + 1,
    kode: item.incidentCode || "-",
    jenis: item.incidentType || "-",
    lokasi: [item.district, item.locationAddress].filter(Boolean).join(" - ") || "-",
    status: item.status || "-",
    waktu: formatDateTime(item.reportedAt),
    korban: item.initialVictims ?? 0,
  }));

  const requestRows = requests.map((item, index) => ({
    no: index + 1,
    kode: item.requestCode || "-",
    pasien: item.patientName || "-",
    pickup: item.pickupDistrict || "-",
    tujuan: item.destinationName || "-",
    prioritas: item.priority || "-",
    status: item.status || "-",
    waktu: formatDateTime(item.createdAt),
  }));


  return {
    reportCode: report.reportCode,
    reportType: report.reportType,
    reportStatus: report.status,
    reportDate: formatDateOnly(report.reportDate),
    reportDateTime: formatDateTime(report.reportDate),
    reportTitle: report.title,
    district: report.district,
    kelurahan: snapshot.extra.kelurahan || "-",
    locationAddress: report.locationAddress || "-",
    weatherCondition: report.weatherCondition || "-",
    operationalSummary: report.operationalSummary || "-",
    situationOverview: report.situationOverview || "-",
    resourceNeeds: report.resourceNeeds || "-",
    recommendation: report.recommendation || "-",
    createdBy: report.createdBy?.fullName || "-",
    createdAt: formatDateTime(report.createdAt),
    submittedAt: formatDateTime(report.submittedAt),
    totalIncidents: incidentRows.length,
    totalRequests: requestRows.length,
    incidents: incidentRows,
    requests: requestRows,
    generatedBy: snapshot.generatedBy,
    // Laporan Harian extras
    anggaranPersekot: snapshot.extra.anggaranPersekot || "0",
    anggaranRealisasi: snapshot.extra.anggaranRealisasi || "0",
    jumlahPeserta: snapshot.extra.jumlahPeserta || "0",
    stokDarahA: snapshot.extra.stokDarahA || "0",
    stokDarahB: snapshot.extra.stokDarahB || "0",
    stokDarahAB: snapshot.extra.stokDarahAB || "0",
    stokDarahO: snapshot.extra.stokDarahO || "0",
    saran: snapshot.extra.saran || "-",
    tindakLanjut: snapshot.extra.tindakLanjut || "-",
    // Laporan Situasi extras
    korbanKK: snapshot.extra.korbanKK || "0",
    korbanJiwa: snapshot.extra.korbanJiwa || "0",
    lukaBerat: snapshot.extra.lukaBerat || "0",
    lukaRingan: snapshot.extra.lukaRingan || "0",
    meninggal: snapshot.extra.meninggal || "0",
    hilang: snapshot.extra.hilang || "0",
    mengungsi: snapshot.extra.mengungsi || "0",
    rusakBerat: snapshot.extra.rusakBerat || "0",
    rusakSedang: snapshot.extra.rusakSedang || "0",
    rusakRingan: snapshot.extra.rusakRingan || "0",
    rumahTerendam: snapshot.extra.rumahTerendam || "0",
    fasSekolah: snapshot.extra.fasSekolah || "0",
    fasIbadah: snapshot.extra.fasIbadah || "0",
    fasKesehatan: snapshot.extra.fasKesehatan || "0",
    fasLainnya: snapshot.extra.fasLainnya || "0",
    totalPersonilPMI: snapshot.extra.totalPersonilPMI || "0",
    armadaDigunakan: snapshot.extra.armadaDigunakan || "-",
    kontakNama: snapshot.extra.kontakNama || "-",
    kontakHp: snapshot.extra.kontakHp || "-",
  };
}

// ─── DOCX cell/row helpers ────────────────────────────────────────────────────

function shade(fill) {
  return { type: ShadingType.CLEAR, color: "auto", fill };
}

function headerCell(text, { colSpan = 1 } = {}) {
  return new TableCell({
    columnSpan: colSpan,
    shading: shade(RED),
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: WHITE, size: NORMAL })],
      }),
    ],
  });
}

function labelCell(text) {
  return new TableCell({
    width: { size: 30, type: WidthType.PERCENTAGE },
    shading: shade("F9D5D3"),
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: NORMAL })],
      }),
    ],
  });
}

function valueCell(text, { colSpan = 1 } = {}) {
  const lines = String(text ?? "-").split("\n");
  return new TableCell({
    columnSpan: colSpan,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: lines.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, size: NORMAL })],
        })
    ),
  });
}

function infoRow(label, value) {
  return new TableRow({ children: [labelCell(label), valueCell(value)] });
}

function thCell(text, pct) {
  return new TableCell({
    width: { size: pct, type: WidthType.PERCENTAGE },
    shading: shade("922B21"),
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: WHITE, size: NORMAL })],
      }),
    ],
  });
}

function tdCell(text, pct) {
  return new TableCell({
    width: { size: pct, type: WidthType.PERCENTAGE },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({ children: [new TextRun({ text: String(text ?? "-"), size: NORMAL })] }),
    ],
  });
}

function buildIncidentTable(incidents) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          thCell("No", 5),
          thCell("Kode", 12),
          thCell("Jenis", 22),
          thCell("Lokasi", 28),
          thCell("Status", 18),
          thCell("Waktu", 15),
        ],
      }),
      ...incidents.map(
        (item) =>
          new TableRow({
            children: [
              tdCell(item.no, 5),
              tdCell(item.kode, 12),
              tdCell(item.jenis, 22),
              tdCell(item.lokasi, 28),
              tdCell(item.status, 18),
              tdCell(item.waktu, 15),
            ],
          })
      ),
    ],
  });
}

function buildRequestTable(requests) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          thCell("No", 4),
          thCell("Kode", 11),
          thCell("Pasien", 20),
          thCell("Penjemputan", 16),
          thCell("Tujuan", 18),
          thCell("Prioritas", 13),
          thCell("Status", 18),
        ],
      }),
      ...requests.map(
        (item) =>
          new TableRow({
            children: [
              tdCell(item.no, 4),
              tdCell(item.kode, 11),
              tdCell(item.pasien, 20),
              tdCell(item.pickup, 16),
              tdCell(item.tujuan, 18),
              tdCell(item.prioritas, 13),
              tdCell(item.status, 18),
            ],
          })
      ),
    ],
  });
}

function buildSignatureTable(data) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell("DILAPORKAN OLEH"),
          headerCell("DIKETAHUI OLEH"),
        ],
      }),
      new TableRow({
        height: { value: 1200, rule: "exact" },
        children: [
          valueCell(""),
          valueCell(""),
        ],
      }),
      new TableRow({
        children: [
          valueCell(data.createdBy),
          valueCell(data.generatedBy),
        ],
      }),
    ],
  });
}

function spacer() {
  return new Paragraph({ text: "", spacing: { after: 120 } });
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 200, after: 120 },
    children: [
      new TextRun({ text, bold: true, color: RED, size: HEADING_PT }),
    ],
  });
}

function headerImageParagraph(headerImageBuffer) {
  if (!headerImageBuffer) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PMI - PALANG MERAH INDONESIA", bold: true, size: 28 })],
    });
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        data: headerImageBuffer,
        transformation: { width: 540, height: 90 },
      }),
    ],
  });
}

function buildLapHarianSections(data, headerImageBuffer) {
  const persekot = toInt(data.anggaranPersekot);
  const realisasi = toInt(data.anggaranRealisasi);
  const saldo = persekot - realisasi;

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("LAPORAN KEGIATAN", { colSpan: 2 })] }),
      infoRow("Kode Laporan", data.reportCode),
      infoRow("Status", data.reportStatus),
      infoRow("Dibuat oleh", data.createdBy),
      infoRow("Dibuat pada", data.createdAt),
    ],
  });

  const contentTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("ISIAN LAPORAN KEGIATAN", { colSpan: 2 })] }),
      infoRow("1. Nama Kegiatan", data.reportTitle),
      infoRow(
        "2. Tempat dan Tanggal Pelaksanaan",
        `Kecamatan: ${data.district}\nKelurahan: ${data.kelurahan}\nTanggal: ${data.reportDate}`
      ),
      infoRow(
        "3. Anggaran (Rp)",
        `Persekot : ${formatRupiah(persekot)}\nRealisasi : ${formatRupiah(realisasi)}\nSaldo     : ${formatRupiah(saldo)}`
      ),
      infoRow("4. Jumlah Peserta", data.jumlahPeserta),
      infoRow("5. Stok Darah (Kantong)", `Gol. A: ${data.stokDarahA} / Gol. B: ${data.stokDarahB} / Gol. AB: ${data.stokDarahAB} / Gol. O: ${data.stokDarahO}`),
      infoRow("6. Hasil-hasil Kegiatan", data.operationalSummary),
      infoRow("7. Kendala / Masalah yang Dihadapi", data.resourceNeeds),
      infoRow("8. Solusi yang Dilakukan / Diambil", data.recommendation),
      infoRow("9. Saran-saran Perbaikan", data.saran),
      infoRow("10. Tindak Lanjut yang Diperlukan", data.tindakLanjut),
    ],
  });

  const sections = [
    headerImageParagraph(headerImageBuffer),
    spacer(),
    mainTable,
    spacer(),
    contentTable,
  ];

  if (data.incidents.length > 0) {
    sections.push(sectionTitle("LAMPIRAN: DATA KEJADIAN / INSIDEN"));
    sections.push(buildIncidentTable(data.incidents));
  }

  if (data.requests.length > 0) {
    sections.push(sectionTitle("LAMPIRAN: DATA PERMINTAAN AMBULANS"));
    sections.push(buildRequestTable(data.requests));
  }

  sections.push(spacer());
  sections.push(buildSignatureTable(data));

  return sections;
}

function buildSituasiSections(data, headerImageBuffer) {
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("LAPORAN SITUASI AWAL BENCANA", { colSpan: 2 })] }),
      infoRow("Kode Laporan", data.reportCode),
      infoRow("Kejadian Bencana", data.reportTitle),
      infoRow("Lokasi", `Kecamatan: ${data.district}\nKelurahan: ${data.kelurahan}`),
      infoRow("Waktu Kejadian", data.reportDateTime),
      infoRow("Kondisi Cuaca", data.weatherCondition),
      infoRow("Akses ke Lokasi", data.locationAddress),
      infoRow("Status Laporan", data.reportStatus),
      infoRow("Dibuat oleh", data.createdBy),
    ],
  });

  const gambaranParagraph = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("GAMBARAN UMUM SITUASI", { colSpan: 2 })] }),
      infoRow("Uraian Situasi", data.situationOverview),
    ],
  });

  // DAMPAK table — two-column label/value
  const dampakTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("DAMPAK BENCANA", { colSpan: 2 })] }),
      new TableRow({ children: [headerCell("Korban Terdampak", { colSpan: 2 })] }),
      infoRow("KK Terdampak", data.korbanKK),
      infoRow("Jiwa Terdampak", data.korbanJiwa),
      new TableRow({ children: [headerCell("Korban Jiwa / Luka / Mengungsi", { colSpan: 2 })] }),
      infoRow("Luka Berat", data.lukaBerat),
      infoRow("Luka Ringan", data.lukaRingan),
      infoRow("Meninggal", data.meninggal),
      infoRow("Hilang", data.hilang),
      infoRow("Mengungsi", data.mengungsi),
      new TableRow({ children: [headerCell("Kerusakan Rumah", { colSpan: 2 })] }),
      infoRow("Rusak Berat", data.rusakBerat),
      infoRow("Rusak Sedang", data.rusakSedang),
      infoRow("Rusak Ringan", data.rusakRingan),
      infoRow("Terendam", data.rumahTerendam),
      new TableRow({ children: [headerCell("Kerusakan Fasilitas", { colSpan: 2 })] }),
      infoRow("Sekolah", data.fasSekolah),
      infoRow("Tempat Ibadah", data.fasIbadah),
      infoRow("Fasilitas Kesehatan", data.fasKesehatan),
      infoRow("Lain-lain", data.fasLainnya),
    ],
  });

  const sdmTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("MOBILISASI SDM PMI", { colSpan: 2 })] }),
      infoRow("Total Personil PMI", data.totalPersonilPMI),
      infoRow("Kendaraan / Ambulans yang Digunakan", data.armadaDigunakan),
    ],
  });

  const giatTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("GIAT PMI", { colSpan: 2 })] }),
      infoRow("Kegiatan PMI di Lapangan", data.operationalSummary),
    ],
  });

  const kebutuhanTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("KEBUTUHAN & HAMBATAN", { colSpan: 2 })] }),
      infoRow("Kebutuhan", data.resourceNeeds),
      infoRow("Hambatan", data.recommendation),
    ],
  });

  const kontakTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell("KONTAK PETUGAS POSKO", { colSpan: 2 })] }),
      infoRow("Nama Petugas", data.kontakNama),
      infoRow("No. HP", data.kontakHp),
    ],
  });

  const sections = [
    headerImageParagraph(headerImageBuffer),
    spacer(),
    infoTable,
    spacer(),
    gambaranParagraph,
    spacer(),
    dampakTable,
    spacer(),
    sdmTable,
    spacer(),
    giatTable,
    spacer(),
    kebutuhanTable,
    spacer(),
    kontakTable,
  ];

  if (data.incidents.length > 0) {
    sections.push(sectionTitle("LAMPIRAN: DATA KEJADIAN / INSIDEN"));
    sections.push(buildIncidentTable(data.incidents));
  }

  if (data.requests.length > 0) {
    sections.push(sectionTitle("LAMPIRAN: DATA PERMINTAAN AMBULANS"));
    sections.push(buildRequestTable(data.requests));
  }

  sections.push(spacer());
  sections.push(buildSignatureTable(data));

  return sections;
}

export async function generatePoskoReportDocx(report) {
  const data = buildTemplateData(report);

  let headerImageBuffer = null;
  try {
    const headerPath = path.join(process.cwd(), "public", "images", "Header.png");
    headerImageBuffer = fs.readFileSync(headerPath);
  } catch (_) {
    // Header image optional; fall back to text
  }

  const children =
    report.reportType === POSKO_REPORT_TYPES.SITUASI
      ? buildSituasiSections(data, headerImageBuffer)
      : buildLapHarianSections(data, headerImageBuffer);

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: { run: { font: "Calibri", size: NORMAL } },
      },
    },
  });

  return Packer.toBuffer(doc);
}

export async function generatePoskoReportPdf(report) {
  const data = buildTemplateData(report);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 36;

  try {
    const headerPath = path.join(process.cwd(), "public", "images", "Header.png");
    const imageBytes = fs.readFileSync(headerPath);
    const image = await pdf.embedPng(imageBytes);
    const scaled = image.scale(0.5);
    page.drawImage(image, {
      x: left,
      y: y - scaled.height,
      width: scaled.width,
      height: scaled.height,
    });
    y -= scaled.height + 14;
  } catch (error) {
    console.error("Failed to embed report header image:", error);
  }

  page.drawText(data.reportTitle, {
    x: left,
    y,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;

  page.drawText(`Kode: ${data.reportCode} | Tipe: ${data.reportType}`, {
    x: left,
    y,
    size: 9,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 14;

  page.drawText(`Tanggal Laporan: ${data.reportDate}`, {
    x: left,
    y,
    size: 9,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 14;

  const summaryLines = [
    `Kecamatan: ${data.district}`,
    `Lokasi: ${data.locationAddress}`,
    `Cuaca: ${data.weatherCondition}`,
    `Total Kejadian Dipilih: ${data.totalIncidents}`,
    `Total Permintaan Dipilih: ${data.totalRequests}`,
  ];

  for (const line of summaryLines) {
    page.drawText(line.slice(0, 110), {
      x: left,
      y,
      size: 9,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 12;
  }

  y -= 6;
  page.drawText("Ringkasan Operasional", {
    x: left,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 12;

  const narrative = [data.operationalSummary, data.situationOverview, data.resourceNeeds, data.recommendation]
    .filter((item) => item && item !== "-")
    .join("\n\n")
    .slice(0, 1800);

  const textBlocks = narrative ? narrative.split("\n") : ["-"];
  for (const line of textBlocks) {
    if (y < 70) break;
    page.drawText(String(line).slice(0, 110), {
      x: left,
      y,
      size: 8,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 10;
  }

  y -= 6;
  page.drawText("Daftar Kejadian Terpilih", {
    x: left,
    y,
    size: 10,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 12;

  for (const incident of data.incidents.slice(0, 12)) {
    if (y < 50) break;
    const line = `${incident.no}. ${incident.kode} | ${incident.jenis} | ${incident.status}`;
    page.drawText(line.slice(0, 110), {
      x: left,
      y,
      size: 8,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 10;
  }

  return pdf.save();
}
