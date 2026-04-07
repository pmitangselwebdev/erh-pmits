import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PDFName } from "pdf-lib";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildLatLngLink(post) {
  if (post.latitude == null || post.longitude == null) return "-";
  return `https://maps.google.com/?q=${post.latitude},${post.longitude}`;
}

function formatCell(value) {
  return String(value || "-").replace(/\s+/g, " ").trim();
}

function getCellText(cell) {
  if (cell && typeof cell === "object") return cell.text || "-";
  return cell;
}

function getCellLink(cell) {
  if (cell && typeof cell === "object") return cell.link || null;
  return null;
}

export async function GET(request, { params }) {
  const rawParam = params?.eventId;
  const fromParams = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const fromPath = new URL(request.url).pathname.split("/").filter(Boolean).at(-2);
  const eventId = decodeURIComponent(fromParams || fromPath || "").trim();

  if (!eventId) {
    return Response.json({ message: "Event medis tidak ditemukan." }, { status: 404 });
  }

  const event = await db.medicalEvent.findUnique({
    where: { id: eventId },
    include: {
      posts: {
        include: {
          teamAssignments: {
            include: {
              user: { select: { fullName: true } },
            },
          },
          logisticPlans: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) {
    return Response.json({ message: "Event medis tidak ditemukan." }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const left = 36;
  const right = 559;
  let y = 800;

  function ensureSpace(minY = 70) {
    if (y >= minY) return;
    page = pdf.addPage([595, 842]);
    y = 800;
  }

  async function drawHeader() {
    try {
      const headerPath = path.join(process.cwd(), "public", "images", "Header.png");
      const imageBytes = fs.readFileSync(headerPath);
      const embedded = await pdf.embedPng(imageBytes);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const scale = pageWidth / embedded.width;
      const scaled = embedded.scale(scale);
      const imageX = 0;
      const imageY = pageHeight - scaled.height;

      page.drawImage(embedded, {
        x: imageX,
        y: imageY,
        width: scaled.width,
        height: scaled.height,
      });
      y = imageY - 18;
    } catch (error) {
      // Header image optional; fall back to text-only header
    }
  }

  await drawHeader();

  drawTextAligned(
    "Daftar Petugas dan Kebutuhan Logistik Event",
    left,
    y,
    right - left,
    "center",
    14,
    boldFont,
    rgb(0.12, 0.12, 0.12)
  );
  y -= 20;

  drawTextAligned(
    `${event.eventCode} - ${event.eventName}`.slice(0, 90),
    left,
    y,
    right - left,
    "center",
    11,
    boldFont,
    rgb(0.15, 0.15, 0.15)
  );
  y -= 16;

  drawTextAligned(
    `Periode: ${formatDateTime(event.startAt)} s/d ${formatDateTime(event.endAt)}`,
    left,
    y,
    right - left,
    "center",
    9,
    font,
    rgb(0.35, 0.35, 0.35)
  );
  y -= 18;

  function splitLongToken(token, maxWidth, size, textFont) {
    const parts = [];
    let buffer = "";

    for (const ch of token) {
      const next = `${buffer}${ch}`;
      if (textFont.widthOfTextAtSize(next, size) <= maxWidth || !buffer) {
        buffer = next;
      } else {
        parts.push(buffer);
        buffer = ch;
      }
    }

    if (buffer) parts.push(buffer);
    return parts;
  }

  function wrapCellText(text, width, size, textFont) {
    const value = formatCell(getCellText(text));
    const maxWidth = Math.max(width - 8, 40);
    if (!value || value === "-") return ["-"];

    const words = value.split(" ");
    const lines = [];
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      const nextWidth = textFont.widthOfTextAtSize(next, size);

      if (nextWidth <= maxWidth || !current) {
        current = next;
        continue;
      }

      lines.push(current);
      current = "";

      if (textFont.widthOfTextAtSize(word, size) > maxWidth) {
        const chunks = splitLongToken(word, maxWidth, size, textFont);
        for (const chunk of chunks) {
          if (textFont.widthOfTextAtSize(chunk, size) > maxWidth) {
            continue;
          }
          if (!current) {
            current = chunk;
          } else {
            lines.push(current);
            current = chunk;
          }
        }
      } else {
        current = word;
      }
    }

    if (current) lines.push(current);
    return lines.slice(0, 5);
  }

  function drawTextAligned(text, x, yPos, width, align, size, textFont, color) {
    const safe = formatCell(getCellText(text));
    const textWidth = textFont.widthOfTextAtSize(safe, size);
    let drawX = x + 4;
    if (align === "center") {
      drawX = x + (width - textWidth) / 2;
    } else if (align === "right") {
      drawX = x + width - textWidth - 4;
    }
    page.drawText(safe, { x: drawX, y: yPos, size, font: textFont, color });
  }

  function drawTable(title, headers, rows, columnWidths, columnAligns) {
    const headerFill = rgb(0.96, 0.9, 0.9);
    const borderColor = rgb(0.82, 0.78, 0.78);
    const textColor = rgb(0.2, 0.2, 0.2);
    const headerHeight = 18;
    const baseFontSize = 8.4;
    const lineHeight = 10;
    const paddingX = 4;

    ensureSpace(110);
    page.drawText(title, {
      x: left,
      y,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 14;

    const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    const startX = left + Math.max(0, (right - left - tableWidth) / 2);

    page.drawRectangle({
      x: startX,
      y: y - headerHeight + 2,
      width: tableWidth,
      height: headerHeight,
      color: headerFill,
      borderColor,
      borderWidth: 1,
    });

    let headerX = startX;
    headers.forEach((label, index) => {
      drawTextAligned(label, headerX, y - 12, columnWidths[index], "center", 9, boldFont, textColor);
      headerX += columnWidths[index];
    });

    y -= headerHeight + 2;

    if (rows.length === 0) {
      page.drawRectangle({
        x: startX,
        y: y - headerHeight + 2,
        width: tableWidth,
        height: headerHeight,
        borderColor,
        borderWidth: 1,
      });
      drawTextAligned("Tidak ada data.", startX, y - 12, tableWidth, "center", 8.5, font, textColor);
      y -= headerHeight + 4;
      return;
    }

    rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) =>
        wrapCellText(cell, columnWidths[index], baseFontSize, font)
      );
      const maxLines = Math.max(...wrapped.map((lines) => lines.length));
      const dynamicHeight = Math.max(18, maxLines * lineHeight + 6);

      ensureSpace(dynamicHeight + 20);
      const rowFill = rowIndex % 2 === 0 ? rgb(1, 1, 1) : rgb(0.985, 0.985, 0.99);

      page.drawRectangle({
        x: startX,
        y: y - dynamicHeight + 2,
        width: tableWidth,
        height: dynamicHeight,
        color: rowFill,
        borderColor,
        borderWidth: 1,
      });

      let cellX = startX;
      row.forEach((cell, index) => {
        const align = columnAligns?.[index] || "center";
        const lines = wrapped[index];
        const textBlockHeight = lines.length * lineHeight;
        let textY = y - (dynamicHeight - textBlockHeight) / 2 - 4;
        const cellLink = getCellLink(cell);

        for (const line of lines) {
          const isLinked = Boolean(cellLink) && line === lines[0];
          const color = isLinked ? rgb(0.12, 0.4, 0.8) : textColor;
          drawTextAligned(line, cellX, textY, columnWidths[index], align, baseFontSize, font, color);

          if (isLinked) {
            const linkAnnot = pdf.context.obj({
              Type: PDFName.of("Annot"),
              Subtype: PDFName.of("Link"),
              Rect: [cellX + 4, textY - 2, cellX + columnWidths[index] - 4, textY + baseFontSize + 2],
              Border: [0, 0, 0],
              A: {
                Type: PDFName.of("Action"),
                S: PDFName.of("URI"),
                URI: pdf.context.obj(cellLink),
              },
            });
            page.node.addAnnot(linkAnnot);
          }
          textY -= lineHeight;
        }
        cellX += columnWidths[index];
      });
      y -= dynamicHeight + 2;
    });

    y -= 6;
  }

  const teamRows = event.posts.flatMap((post) =>
    post.teamAssignments.map((assignment) => ({
      petugas: assignment.user?.fullName || "-",
      role: assignment.staffRole,
      pos: post.postName,
      tipe: post.postType,
      lokasi: post.locationAddress,
      km: post.kmPoint || "-",
      link: buildLatLngLink(post) === "-"
        ? "-"
        : {
            text: "Lihat lokasi",
            link: buildLatLngLink(post),
          },
    }))
  );

  drawTable(
    "Daftar Petugas",
    ["Nama Petugas", "Role", "Nama Pos", "Tipe Pos", "Lokasi Pos", "KM", "Long/Lat"],
    teamRows.map((row) => [row.petugas, row.role, row.pos, row.tipe, row.lokasi, row.km, row.link]),
    [90, 55, 80, 60, 140, 40, 90],
    ["center", "center", "center", "center", "center", "center", "center"]
  );

  const logisticRows = event.posts.flatMap((post) =>
    post.logisticPlans.map((plan) => ({
      item: plan.itemName,
      pos: post.postName,
      qty: String(plan.requiredQty),
    }))
  );

  drawTable(
    "Kebutuhan Logistik",
    ["Nama Item Logistik", "Lokasi Pos", "Jumlah Item"],
    logisticRows.map((row) => [row.item, row.pos, row.qty]),
    [220, 220, 80],
    ["center", "center", "center"]
  );

  const bytes = await pdf.save();

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="daftar-petugas-logistik-${event.eventCode}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
