"use client";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import type {
  ParsedDataset,
  Insight,
  ColumnMeta,
  ColumnStats,
  NumericStats,
  CategoricalStats,
  CorrelationResult,
} from "@/types/dataset";

interface ReportOptions {
  dataset: ParsedDataset;
  filename: string;
  insightSource: "ai" | "rules" | "loading" | null;
  providerLabel: string;
}

interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

interface TextMeasure {
  lines: string[];
  height: number;
  lineHeight: number;
}

interface MetricCardData {
  label: string;
  value: string;
  detail?: string;
}

interface SignalRow {
  label: string;
  value: number;
  note: string;
}

interface PanelSpec {
  title: string;
  tone?: Color;
  items: string[];
}

type Color = ReturnType<typeof rgb>;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 52;
const MARGIN_BOTTOM = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const FOOTER_Y = 16;
const SECTION_BAND_H = 32;
const BODY_TOP = PAGE_HEIGHT - MARGIN_TOP - 126;
const BODY_BOTTOM = MARGIN_BOTTOM + 30;
const BLOCK_GAP = 18;
const COLUMN_GAP = 18;

const BRAND = rgb(0.09, 0.67, 0.31);
const BRAND_DEEP = rgb(0.05, 0.14, 0.1);
const BRAND_MID = rgb(0.11, 0.31, 0.2);
const BRAND_SOFT = rgb(0.92, 0.98, 0.94);
const BRAND_TINT = rgb(0.965, 0.992, 0.972);
const SURFACE = rgb(0.985, 0.99, 0.986);
const SURFACE_ALT = rgb(0.975, 0.988, 0.98);
const LINE = rgb(0.84, 0.89, 0.86);
const TEXT = rgb(0.08, 0.11, 0.14);
const TEXT_MUTED = rgb(0.4, 0.45, 0.48);
const TEXT_LIGHT = rgb(0.81, 0.88, 0.84);
const WHITE = rgb(1, 1, 1);
const WARN = rgb(0.75, 0.35, 0.08);
const INFO = rgb(0.12, 0.44, 0.25);

const PDF_CHAR_REPLACEMENTS: Record<string, string> = {
  "\u03b1": "alpha",
  "\u03b2": "beta",
  "\u03b3": "gamma",
  "\u03b4": "delta",
  "\u03b5": "epsilon",
  "\u03bb": "lambda",
  "\u03bc": "mu",
  "\u03c0": "pi",
  "\u03c3": "sigma",
  "\u03c4": "tau",
  "\u03c6": "phi",
  "\u03c9": "omega",
  "\u0391": "Alpha",
  "\u0392": "Beta",
  "\u0393": "Gamma",
  "\u0394": "Delta",
  "\u039b": "Lambda",
  "\u03a0": "Pi",
  "\u03a3": "Sigma",
  "\u03a6": "Phi",
  "\u03a9": "Omega",
  "\u2264": "<=",
  "\u2265": ">=",
  "\u2248": "~",
  "\u2260": "!=",
  "\u2022": "-",
  "\u00b7": " - ",
  "\u2014": "-",
  "\u2013": "-",
  "\u201c": '"',
  "\u201d": '"',
  "\u2018": "'",
  "\u2019": "'",
  "\u2026": "...",
};

function sanitizePdfText(value: string) {
  return Array.from(String(value))
    .map((char) => PDF_CHAR_REPLACEMENTS[char] ?? char)
    .join("")
    .replace(/[^\x20-\x7E\n\r\t]/g, "");
}

function saveBlob(bytes: Uint8Array, filename: string) {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const clean = sanitizePdfText(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let segment = "";
    for (const char of word) {
      const trial = `${segment}${char}`;
      if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
        segment = trial;
      } else {
        if (segment) lines.push(segment);
        segment = char;
      }
    }
    current = segment;
  }

  if (current) lines.push(current);
  return lines;
}

function measureText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  lineHeight = fontSize * 1.45
): TextMeasure {
  const lines = wrapText(text, font, fontSize, maxWidth);
  const height = lines.length === 0 ? 0 : lines.length * lineHeight;
  return { lines, height, lineHeight };
}

function drawMeasuredText(
  page: PDFPage,
  measure: TextMeasure,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  color: Color
) {
  let cursorY = y;
  measure.lines.forEach((line) => {
    page.drawText(line, { x, y: cursorY, size: fontSize, font, color });
    cursorY -= measure.lineHeight;
  });
  return cursorY;
}

function drawLabel(
  page: PDFPage,
  fonts: FontSet,
  text: string,
  x: number,
  y: number,
  color = TEXT_MUTED
) {
  page.drawText(sanitizePdfText(text.toUpperCase()), {
    x,
    y,
    size: 8.5,
    font: fonts.bold,
    color,
  });
}

function drawFooter(page: PDFPage, fonts: FontSet, pageIndex: number, pageCount: number) {
  page.drawLine({
    start: { x: MARGIN_X, y: FOOTER_Y + 10 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: FOOTER_Y + 10 },
    thickness: 1,
    color: LINE,
  });
  page.drawText("Bayynah report", {
    x: MARGIN_X,
    y: FOOTER_Y,
    size: 8.5,
    font: fonts.italic,
    color: TEXT_MUTED,
  });
  page.drawText(`Page ${pageIndex} of ${pageCount}`, {
    x: PAGE_WIDTH - MARGIN_X - 58,
    y: FOOTER_Y,
    size: 8.5,
    font: fonts.regular,
    color: TEXT_MUTED,
  });
}

function sourceLabel(
  insightSource: "ai" | "rules" | "loading" | null,
  providerLabel: string
) {
  if (insightSource === "ai") return `AI-generated via ${providerLabel}`;
  if (insightSource === "loading") {
    return `Rule-based findings while ${providerLabel} is still processing`;
  }
  return "Rule-based findings";
}

function toneForInsight(insight: Insight) {
  if (insight.severity === "warning") return WARN;
  if (insight.severity === "highlight") return BRAND;
  return INFO;
}

function summarizeColumn(column: ColumnMeta, stats: Record<string, ColumnStats>) {
  const current = stats[column.name];
  if (!current) return "No structured summary available.";

  if (column.type === "numeric") {
    const numeric = current as NumericStats;
    return `Mean ${numeric.mean.toFixed(2)}, median ${numeric.median.toFixed(
      2
    )}, range ${numeric.min.toFixed(2)} to ${numeric.max.toFixed(2)}.`;
  }

  if (column.type === "categorical") {
    const categorical = current as CategoricalStats;
    return `Most common value "${sanitizePdfText(
      categorical.mostCommon
    )}" appears in ${(categorical.mostCommonPct * 100).toFixed(1)}% of rows.`;
  }

  if (column.type === "datetime") {
    return "Date-like field retained for structural context and timeline inspection.";
  }

  return "Long-form text field retained for context and excluded from baseline charting.";
}

function executiveSummaryLine(dataset: ParsedDataset) {
  const significant = dataset.correlations.filter((item) => item.significant).length;
  const totalMissing = dataset.columns.reduce(
    (sum, column) => sum + column.missingCount,
    0
  );

  return `This dataset contains ${dataset.rowCount.toLocaleString()} rows across ${
    dataset.colCount
  } columns, with ${totalMissing.toLocaleString()} missing values, ${
    dataset.anomalies.length
  } anomaly flags, and ${significant} significant correlation${
    significant === 1 ? "" : "s"
  } worth validation.`;
}

function shortenCorrelationLabel(item: CorrelationResult) {
  const label = `${item.colA} vs ${item.colB}`;
  return label.length > 28 ? `${label.slice(0, 25)}...` : label;
}

function createSectionPage(
  pdf: PDFDocument,
  fonts: FontSet,
  pages: PDFPage[],
  sectionNumber: string,
  title: string,
  subtitle: string
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  page.drawRectangle({
    x: MARGIN_X,
    y: PAGE_HEIGHT - MARGIN_TOP - SECTION_BAND_H,
    width: CONTENT_WIDTH,
    height: SECTION_BAND_H,
    color: BRAND_TINT,
  });
  drawLabel(page, fonts, `Section ${sectionNumber}`, MARGIN_X + 16, PAGE_HEIGHT - MARGIN_TOP - 21, BRAND);
  page.drawText(sanitizePdfText(title), {
    x: MARGIN_X,
    y: PAGE_HEIGHT - MARGIN_TOP - 78,
    size: 24,
    font: fonts.bold,
    color: TEXT,
  });
  const subtitleMeasure = measureText(subtitle, fonts.regular, 10.5, CONTENT_WIDTH, 14);
  drawMeasuredText(page, subtitleMeasure, MARGIN_X, PAGE_HEIGHT - MARGIN_TOP - 100, fonts.regular, 10.5, TEXT_MUTED);
  return { page, cursorY: BODY_TOP };
}

function measureMetricCard(metric: MetricCardData, fonts: FontSet, width: number) {
  const detail = metric.detail
    ? measureText(metric.detail, fonts.regular, 9.5, width - 28, 12)
    : null;
  const height = 68 + (detail ? detail.height : 0);
  return { detail, height };
}

function drawMetricCard(
  page: PDFPage,
  fonts: FontSet,
  metric: MetricCardData,
  x: number,
  y: number,
  width: number,
  dark = false
) {
  const measured = measureMetricCard(metric, fonts, width);
  page.drawRectangle({
    x,
    y: y - measured.height,
    width,
    height: measured.height,
    color: dark ? BRAND_MID : SURFACE,
    borderColor: dark ? BRAND : LINE,
    borderWidth: 1,
  });
  drawLabel(page, fonts, metric.label, x + 14, y - 18, dark ? TEXT_LIGHT : TEXT_MUTED);
  page.drawText(sanitizePdfText(metric.value), {
    x: x + 14,
    y: y - 42,
    size: 22,
    font: fonts.bold,
    color: dark ? WHITE : TEXT,
  });
  if (measured.detail) {
    drawMeasuredText(
      page,
      measured.detail,
      x + 14,
      y - 58,
      fonts.regular,
      9.5,
      dark ? TEXT_LIGHT : TEXT_MUTED
    );
  }
  return measured.height;
}

function measureBulletPanel(
  title: string,
  items: string[],
  fonts: FontSet,
  width: number
) {
  const titleGap = 26;
  const contentWidth = width - 30;
  const itemMeasures = items.map((item) =>
    measureText(item, fonts.regular, 10.5, contentWidth - 16, 14)
  );
  const itemsHeight = itemMeasures.reduce((sum, item) => sum + item.height + 7, 0);
  return { itemMeasures, height: 20 + titleGap + itemsHeight + 16 };
}

function drawBulletPanel(
  page: PDFPage,
  fonts: FontSet,
  panel: PanelSpec,
  x: number,
  y: number,
  width: number,
  background: Color = SURFACE
) {
  const measured = measureBulletPanel(panel.title, panel.items, fonts, width);
  const tone = panel.tone ?? BRAND;
  page.drawRectangle({
    x,
    y: y - measured.height,
    width,
    height: measured.height,
    color: background,
    borderColor: LINE,
    borderWidth: 1,
  });
  drawLabel(page, fonts, panel.title, x + 14, y - 18, tone);
  let cursorY = y - 42;
  measured.itemMeasures.forEach((itemMeasure, index) => {
    page.drawCircle({
      x: x + 17,
      y: cursorY + 2,
      size: 2.3,
      color: tone,
    });
    drawMeasuredText(
      page,
      itemMeasure,
      x + 30,
      cursorY,
      fonts.regular,
      10.5,
      TEXT
    );
    cursorY -= itemMeasure.height + 7;
  });
  return measured.height;
}

function measureSignalPanel(
  title: string,
  items: SignalRow[],
  fonts: FontSet,
  width: number
) {
  const labelWidth = 88;
  const noteWidth = width - 30;
  const rows = items.map((item) => {
    const label = measureText(item.label, fonts.bold, 8.75, labelWidth, 11);
    const note = measureText(item.note, fonts.regular, 7.75, noteWidth, 10);
    const rowHeight = Math.max(label.height, 11) + 10 + note.height + 10;
    return { label, note, rowHeight };
  });
  const height = 42 + rows.reduce((sum, row) => sum + row.rowHeight, 0) + 10;
  return { rows, height };
}

function drawSignalPanel(
  page: PDFPage,
  fonts: FontSet,
  title: string,
  items: SignalRow[],
  x: number,
  y: number,
  width: number
) {
  const measured = measureSignalPanel(title, items, fonts, width);
  page.drawRectangle({
    x,
    y: y - measured.height,
    width,
    height: measured.height,
    color: SURFACE,
    borderColor: LINE,
    borderWidth: 1,
  });
  drawLabel(page, fonts, title, x + 14, y - 18, BRAND);

  const trackX = x + 110;
  const trackWidth = width - 126;
  const maxValue = Math.max(...items.map((item) => Math.abs(item.value)), 1);
  let cursorY = y - 42;

  measured.rows.forEach((row, index) => {
    drawMeasuredText(page, row.label, x + 14, cursorY, fonts.bold, 8.75, TEXT);
    page.drawRectangle({
      x: trackX,
      y: cursorY - 4,
      width: trackWidth,
      height: 8,
      color: BRAND_SOFT,
    });
    page.drawRectangle({
      x: trackX,
      y: cursorY - 4,
      width: Math.max(8, (Math.abs(items[index].value) / maxValue) * trackWidth),
      height: 8,
      color: BRAND,
    });
    drawMeasuredText(
      page,
      row.note,
      x + 14,
      cursorY - (row.label.lines.length ? row.label.height : 11) - 2,
      fonts.regular,
      7.75,
      TEXT_MUTED
    );
    cursorY -= row.rowHeight;
  });

  return measured.height;
}

function measureInsightCard(insight: Insight, fonts: FontSet, width: number) {
  const title = measureText(insight.title, fonts.bold, 12, width - 28, 15);
  const body = measureText(insight.body, fonts.regular, 10.25, width - 28, 13);
  return { title, body, height: 28 + title.height + body.height + 12 };
}

function drawInsightCard(
  page: PDFPage,
  fonts: FontSet,
  insight: Insight,
  x: number,
  y: number,
  width: number
) {
  const measured = measureInsightCard(insight, fonts, width);
  const tone = toneForInsight(insight);
  page.drawRectangle({
    x,
    y: y - measured.height,
    width,
    height: measured.height,
    color: SURFACE,
    borderColor: LINE,
    borderWidth: 1,
  });
  page.drawRectangle({
    x,
    y: y - measured.height,
    width: 6,
    height: measured.height,
    color: tone,
  });
  const titleBottom = drawMeasuredText(
    page,
    measured.title,
    x + 16,
    y - 16,
    fonts.bold,
    12,
    TEXT
  );
  drawMeasuredText(page, measured.body, x + 16, titleBottom - 2, fonts.regular, 10.25, TEXT_MUTED);
  return measured.height;
}

function drawMiniHistogram(
  page: PDFPage,
  histogram: { bin: string; count: number }[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  const bins = histogram.slice(0, 16);
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
  const gap = 2;
  const barWidth = Math.max(3, (width - gap * (bins.length - 1)) / bins.length);
  const plotBase = y - height + 4;
  const plotHeight = height - 8;

  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: BRAND_SOFT,
  });

  bins.forEach((bin, index) => {
    const barHeight = Math.max(3, (bin.count / maxCount) * plotHeight);
    page.drawRectangle({
      x: x + index * (barWidth + gap),
      y: plotBase,
      width: barWidth,
      height: barHeight,
      color: BRAND,
    });
  });
}

function measureAppendixCard(
  column: ColumnMeta,
  stats: Record<string, ColumnStats>,
  fonts: FontSet,
  width: number
) {
  const stat = stats[column.name];
  const summary = `${summarizeColumn(column, stats)} Missing ${column.missingCount.toLocaleString()}, unique ${column.uniqueCount.toLocaleString()}.`;
  const body = measureText(summary, fonts.regular, 9.75, width - 28, 12);
  const chartHeight = column.type === "numeric" || column.type === "categorical" ? 52 : 0;
  const categoricalRows =
    column.type === "categorical" && stat && "frequencies" in stat
      ? Math.min(3, (stat as CategoricalStats).frequencies.length)
      : 0;
  const categoricalExtra = categoricalRows > 0 ? categoricalRows * 14 : 0;
  const visualHeight = column.type === "categorical" ? categoricalExtra + 8 : chartHeight;
  return { body, height: 38 + visualHeight + body.height + 18 };
}

function drawAppendixCard(
  page: PDFPage,
  fonts: FontSet,
  column: ColumnMeta,
  stats: Record<string, ColumnStats>,
  x: number,
  y: number,
  width: number
) {
  const measured = measureAppendixCard(column, stats, fonts, width);
  const stat = stats[column.name];
  page.drawRectangle({
    x,
    y: y - measured.height,
    width,
    height: measured.height,
    color: SURFACE,
    borderColor: LINE,
    borderWidth: 1,
  });
  drawLabel(page, fonts, column.type, x + 14, y - 18, BRAND);
  page.drawText(sanitizePdfText(column.name), {
    x: x + 14,
    y: y - 34,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  let cursorY = y - 54;
  if (column.type === "numeric" && stat && "histogram" in stat) {
    drawMiniHistogram(page, (stat as NumericStats).histogram, x + 14, cursorY, width - 28, 42);
    cursorY -= 54;
  } else if (column.type === "categorical" && stat && "frequencies" in stat) {
    const frequencies = (stat as CategoricalStats).frequencies.slice(0, 3);
    const maxCount = Math.max(...frequencies.map((item) => item.count), 1);
    frequencies.forEach((item) => {
      page.drawText(sanitizePdfText(String(item.value)), {
        x: x + 14,
        y: cursorY,
        size: 8.5,
        font: fonts.bold,
        color: TEXT,
      });
      page.drawRectangle({
        x: x + 74,
        y: cursorY - 2,
        width: width - 102,
        height: 6,
        color: BRAND_SOFT,
      });
      page.drawRectangle({
        x: x + 74,
        y: cursorY - 2,
        width: Math.max(8, ((width - 102) * item.count) / maxCount),
        height: 6,
        color: BRAND,
      });
      cursorY -= 14;
    });
    cursorY -= 6;
  }

  drawMeasuredText(page, measured.body, x + 14, cursorY, fonts.regular, 9.75, TEXT_MUTED);
  return measured.height;
}

async function loadLogoBytes() {
  try {
    const response = await fetch("/logo - header.png");
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

export async function generatePdfReport({
  dataset,
  filename,
  insightSource,
  providerLabel,
}: ReportOptions) {
  const pdf = await PDFDocument.create();
  const fonts: FontSet = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  const logoBytes = await loadLogoBytes();
  const logo: PDFImage | null = logoBytes ? await pdf.embedPng(logoBytes) : null;
  const pages: PDFPage[] = [];

  const totalMissing = dataset.columns.reduce((sum, column) => sum + column.missingCount, 0);
  const numericColumns = dataset.columns.filter((column) => column.type === "numeric").length;
  const categoricalColumns = dataset.columns.filter((column) => column.type === "categorical").length;
  const datetimeColumns = dataset.columns.filter((column) => column.type === "datetime").length;
  const textColumns = dataset.columns.filter((column) => column.type === "text").length;
  const topInsights = [...dataset.insights]
    .sort((left, right) => {
      const weight = { highlight: 0, warning: 1, info: 2 };
      return weight[left.severity] - weight[right.severity];
    })
    .slice(0, 6);
  const topCorrelations = [...dataset.correlations]
    .filter((item) => item.significant)
    .sort((left, right) => Math.abs(right.r) - Math.abs(left.r))
    .slice(0, 5);
  const missingColumns = [...dataset.columns]
    .filter((column) => column.missingCount > 0)
    .sort((left, right) => right.missingCount - left.missingCount)
    .slice(0, 5);
  const anomalyCounts = Object.entries(
    dataset.anomalies.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.column] = (accumulator[row.column] ?? 0) + 1;
      return accumulator;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);
  const appendixColumns = dataset.columns.slice(0, 10);
  const safeFilename = sanitizePdfText(filename || "Uploaded dataset");

  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(cover);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: BRAND_DEEP });
  cover.drawRectangle({ x: PAGE_WIDTH - 176, y: 0, width: 176, height: PAGE_HEIGHT, color: BRAND_MID });
  cover.drawRectangle({ x: PAGE_WIDTH - 210, y: 92, width: 132, height: 132, color: BRAND });
  cover.drawRectangle({ x: PAGE_WIDTH - 156, y: 126, width: 64, height: 64, color: WHITE });

  if (logo) {
    const width = 128;
    const height = (logo.height / logo.width) * width;
    cover.drawImage(logo, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - MARGIN_TOP - height + 8,
      width,
      height,
    });
  } else {
    cover.drawText("BAYYNAH", {
      x: MARGIN_X,
      y: PAGE_HEIGHT - MARGIN_TOP,
      size: 22,
      font: fonts.bold,
      color: WHITE,
    });
  }

  drawLabel(cover, fonts, "Data intelligence report", MARGIN_X, PAGE_HEIGHT - 166, TEXT_LIGHT);
  cover.drawText("From raw rows to", {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 210,
    size: 30,
    font: fonts.bold,
    color: WHITE,
  });
  cover.drawText("Bayynah clarity.", {
    x: MARGIN_X,
    y: PAGE_HEIGHT - 246,
    size: 30,
    font: fonts.bold,
    color: BRAND,
  });

  const coverBody = measureText(
    "Designed for analysts, data leaders, and executive readers. This print-ready report condenses structure, signal, quality, and risk into a document that can be reviewed away from the product surface.",
    fonts.regular,
    10.75,
    262,
    15
  );
  drawMeasuredText(cover, coverBody, MARGIN_X, PAGE_HEIGHT - 286, fonts.regular, 10.75, TEXT_LIGHT);

  const metaFilename = measureText(safeFilename, fonts.bold, 14, 284, 18);
  const metaSource = measureText(sourceLabel(insightSource, providerLabel), fonts.bold, 10.5, 150, 13);
  const metaGenerated = measureText(
    sanitizePdfText(new Date().toLocaleString()),
    fonts.bold,
    10.5,
    108,
    13
  );
  const metaHeight = Math.max(130, 58 + metaFilename.height + Math.max(metaSource.height, metaGenerated.height));
  const metaTop = PAGE_HEIGHT - 352 - metaHeight;

  cover.drawRectangle({
    x: MARGIN_X,
    y: metaTop,
    width: 320,
    height: metaHeight,
    color: BRAND_MID,
    borderColor: BRAND,
    borderWidth: 1,
  });
  drawLabel(cover, fonts, "Dataset", MARGIN_X + 18, metaTop + metaHeight - 24, TEXT_LIGHT);
  const metaAfterName = drawMeasuredText(cover, metaFilename, MARGIN_X + 18, metaTop + metaHeight - 48, fonts.bold, 14, WHITE);
  drawLabel(cover, fonts, "Insight source", MARGIN_X + 18, metaAfterName - 16, TEXT_LIGHT);
  drawMeasuredText(cover, metaSource, MARGIN_X + 18, metaAfterName - 36, fonts.bold, 10.5, WHITE);
  drawLabel(cover, fonts, "Generated", MARGIN_X + 190, metaAfterName - 16, TEXT_LIGHT);
  drawMeasuredText(cover, metaGenerated, MARGIN_X + 190, metaAfterName - 36, fonts.bold, 10.5, WHITE);

  const summaryText = measureText(executiveSummaryLine(dataset), fonts.bold, 17, 380, 22);
  const summaryTop = metaTop - 30;
  drawLabel(cover, fonts, "Executive frame", MARGIN_X, summaryTop, TEXT_LIGHT);
  drawMeasuredText(cover, summaryText, MARGIN_X, summaryTop - 28, fonts.bold, 17, WHITE);

  const coverMetrics: MetricCardData[] = [
    { label: "Rows", value: dataset.rowCount.toLocaleString() },
    { label: "Columns", value: String(dataset.colCount) },
    { label: "Anomalies", value: String(dataset.anomalies.length) },
    { label: "Signals", value: String(topCorrelations.length) },
  ];
  coverMetrics.forEach((metric, index) => {
    drawMetricCard(cover, fonts, metric, MARGIN_X + index * 122, 180, 110, true);
  });
  cover.drawText("Bayynah turns uploaded datasets into reviewable decision documents.", {
    x: MARGIN_X,
    y: FOOTER_Y + 28,
    size: 10.5,
    font: fonts.italic,
    color: TEXT_LIGHT,
  });

  const overviewState = createSectionPage(
    pdf,
    fonts,
    pages,
    "01",
    "Orientation and dataset frame",
    "A print-first summary of the dataset's shape, readiness, and operating context."
  );

  const overviewMetrics: MetricCardData[] = [
    { label: "Rows", value: dataset.rowCount.toLocaleString(), detail: "Parsed records available for analysis" },
    { label: "Columns", value: String(dataset.colCount), detail: "Fields detected in the uploaded file" },
    {
      label: "Missing values",
      value: totalMissing.toLocaleString(),
      detail: totalMissing === 0 ? "No missingness detected" : "Review before downstream decisions",
    },
  ];
  const metricWidth = (CONTENT_WIDTH - 2 * COLUMN_GAP) / 3;
  let metricRowHeight = 0;
  overviewMetrics.forEach((metric) => {
    metricRowHeight = Math.max(metricRowHeight, measureMetricCard(metric, fonts, metricWidth).height);
  });
  overviewMetrics.forEach((metric, index) => {
    drawMetricCard(
      overviewState.page,
      fonts,
      metric,
      MARGIN_X + index * (metricWidth + COLUMN_GAP),
      overviewState.cursorY,
      metricWidth
    );
  });
  let overviewY = overviewState.cursorY - metricRowHeight - BLOCK_GAP;

  const leftWidth = 248;
  const rightWidth = CONTENT_WIDTH - leftWidth - COLUMN_GAP;
  const summaryPanel = measureBulletPanel(
    "Executive summary",
    [executiveSummaryLine(dataset)],
    fonts,
    leftWidth
  );
  const fieldMixPanel = measureSignalPanel(
    "Field mix",
    [
      { label: "Numeric", value: numericColumns, note: `${numericColumns} quantitative fields` },
      { label: "Categorical", value: categoricalColumns, note: `${categoricalColumns} label-driven fields` },
      { label: "Datetime", value: datetimeColumns, note: `${datetimeColumns} timeline fields` },
      { label: "Text", value: textColumns, note: `${textColumns} long-form fields` },
    ],
    fonts,
    rightWidth
  );
  const dualPanelHeight = Math.max(summaryPanel.height, fieldMixPanel.height);

  drawBulletPanel(
    overviewState.page,
    fonts,
    { title: "Executive summary", items: [executiveSummaryLine(dataset)], tone: BRAND },
    MARGIN_X,
    overviewY,
    leftWidth,
    BRAND_TINT
  );
  drawSignalPanel(
    overviewState.page,
    fonts,
    "Field mix",
    [
      { label: "Numeric", value: numericColumns, note: `${numericColumns} quantitative fields` },
      { label: "Categorical", value: categoricalColumns, note: `${categoricalColumns} label-driven fields` },
      { label: "Datetime", value: datetimeColumns, note: `${datetimeColumns} timeline fields` },
      { label: "Text", value: textColumns, note: `${textColumns} long-form fields` },
    ],
    MARGIN_X + leftWidth + COLUMN_GAP,
    overviewY,
    rightWidth
  );
  overviewY -= dualPanelHeight + BLOCK_GAP;

  drawBulletPanel(
    overviewState.page,
    fonts,
    {
      title: "Insight provenance",
      tone: BRAND,
      items: [
        insightSource === "ai"
          ? `This report includes AI-generated narrative findings via ${providerLabel}. The narrative is grounded in the same structural checks, anomalies, and correlations shown inside Bayynah.`
          : insightSource === "loading"
            ? `This report is currently using Bayynah's rule-based findings while ${providerLabel} continues processing.`
            : "This report is fully rule-based. Findings are generated from Bayynah's structural checks, summary statistics, anomaly detection, and significant correlations.",
        `${numericColumns} numeric fields and ${categoricalColumns} categorical fields are available for charting and baseline model support.`,
        totalMissing > 0
          ? `${totalMissing.toLocaleString()} missing values should be reviewed before using the report for decision support.`
          : "No missing values were detected in the current parsed structure.",
        dataset.anomalies.length > 0
          ? `${dataset.anomalies.length} anomaly flags suggest a follow-up review of extremes before committing to downstream interpretation.`
          : "No anomaly flags were raised in the baseline numeric checks.",
      ],
    },
    MARGIN_X,
    overviewY,
    CONTENT_WIDTH
  );

  let findingsState = createSectionPage(
    pdf,
    fonts,
    pages,
    "02",
    "Findings for stakeholder review",
    "The clearest story threads from the current run, framed for analyst and executive audiences."
  );

  const insightsToRender: Insight[] =
    topInsights.length > 0
      ? topInsights
      : [
          {
            id: "fallback",
            type: "general",
            severity: "info",
            title: "No high-signal narrative findings were produced",
            body: "The current run did not produce a standout narrative result. Review quality and appendix sections for the strongest next actions.",
          },
        ];

  for (const insight of insightsToRender) {
    const measured = measureInsightCard(insight, fonts, CONTENT_WIDTH);
    if (findingsState.cursorY - measured.height < BODY_BOTTOM) {
      findingsState = createSectionPage(
        pdf,
        fonts,
        pages,
        "02",
        "Findings for stakeholder review",
        "Continued findings from the current report."
      );
    }
    drawInsightCard(findingsState.page, fonts, insight, MARGIN_X, findingsState.cursorY, CONTENT_WIDTH);
    findingsState.cursorY -= measured.height + BLOCK_GAP;
  }

  let qualityState = createSectionPage(
    pdf,
    fonts,
    pages,
    "03",
    "Quality, anomalies, and signal strength",
    "Compact diagnostics that help the reader judge trust, distortion risk, and relationships worth validating."
  );

  const qualityBlocks = [
    {
      type: "signal" as const,
      title: "Correlation watchlist",
      rows:
        topCorrelations.length > 0
          ? topCorrelations.map((item) => ({
              label: shortenCorrelationLabel(item),
              value: Math.abs(item.r),
              note: `r=${item.r.toFixed(2)}, p=${item.pValue < 0.001 ? "< 0.001" : item.pValue.toFixed(3)}, n=${item.n}`,
            }))
          : [{ label: "No strong pairs", value: 0, note: "No statistically significant numeric relationships were elevated." }],
    },
    {
      type: "bullet" as const,
      panel: {
        title: "Missingness watchlist",
        tone: WARN,
        items:
          missingColumns.length > 0
            ? missingColumns.map(
                (column) =>
                  `${column.name}: ${column.missingCount.toLocaleString()} missing values, ${column.uniqueCount.toLocaleString()} unique values.`
              )
            : ["No columns with meaningful missingness were elevated in the watchlist."],
      },
    },
    {
      type: "bullet" as const,
      panel: {
        title: "Anomaly concentration",
        tone: WARN,
        items:
          anomalyCounts.length > 0
            ? anomalyCounts.map(([column, count]) => `${column}: ${count} anomaly flags.`)
            : ["No concentrated anomaly clusters were found in the baseline checks."],
      },
    },
    {
      type: "bullet" as const,
      panel: {
        title: "Interpretation note",
        tone: BRAND,
        items: [
          "Relationships in this section are directional clues, not causal proof. They should be validated against domain knowledge, data collection realities, and the business process surrounding the source system.",
        ],
      },
    },
  ];

  for (const block of qualityBlocks) {
    const height =
      block.type === "signal"
        ? measureSignalPanel(block.title, block.rows, fonts, CONTENT_WIDTH).height
        : measureBulletPanel(block.panel.title, block.panel.items, fonts, CONTENT_WIDTH).height;

    if (qualityState.cursorY - height < BODY_BOTTOM) {
      qualityState = createSectionPage(
        pdf,
        fonts,
        pages,
        "03",
        "Quality, anomalies, and signal strength",
        "Continued diagnostics for trust and interpretation."
      );
    }

    if (block.type === "signal") {
      drawSignalPanel(
        qualityState.page,
        fonts,
        block.title,
        block.rows,
        MARGIN_X,
        qualityState.cursorY,
        CONTENT_WIDTH
      );
    } else {
      drawBulletPanel(
        qualityState.page,
        fonts,
        block.panel,
        MARGIN_X,
        qualityState.cursorY,
        CONTENT_WIDTH,
        block.panel.title === "Interpretation note" ? BRAND_TINT : SURFACE
      );
    }

    qualityState.cursorY -= height + BLOCK_GAP;
  }

  let appendixPage = createSectionPage(
    pdf,
    fonts,
    pages,
    "04",
    "Column appendix",
    "Column-level profiles with compact visuals for analyst follow-up."
  );
  let leftY = appendixPage.cursorY;
  let rightY = appendixPage.cursorY;
  const columnWidth = (CONTENT_WIDTH - COLUMN_GAP) / 2;

  for (const column of appendixColumns) {
    const cardHeight = measureAppendixCard(column, dataset.stats, fonts, columnWidth).height;
    let useLeft = leftY >= rightY;
    let targetY = useLeft ? leftY : rightY;

    if (targetY - cardHeight < BODY_BOTTOM) {
      const alternateY = useLeft ? rightY : leftY;
      if (alternateY - cardHeight >= BODY_BOTTOM) {
        useLeft = !useLeft;
        targetY = alternateY;
      } else {
        appendixPage = createSectionPage(
          pdf,
          fonts,
          pages,
          "04",
          "Column appendix",
          "Continued column-level profiles."
        );
        leftY = appendixPage.cursorY;
        rightY = appendixPage.cursorY;
        useLeft = true;
        targetY = leftY;
      }
    }

    const x = useLeft ? MARGIN_X : MARGIN_X + columnWidth + COLUMN_GAP;
    drawAppendixCard(
      appendixPage.page,
      fonts,
      column,
      dataset.stats,
      x,
      targetY,
      columnWidth
    );

    if (useLeft) {
      leftY = targetY - cardHeight - BLOCK_GAP;
    } else {
      rightY = targetY - cardHeight - BLOCK_GAP;
    }
  }

  pages.forEach((page, index) => drawFooter(page, fonts, index + 1, pages.length));

  const bytes = await pdf.save();
  const safeBaseName = sanitizePdfText(
    (filename || "bayynah-report").replace(/\.[^.]+$/, "")
  );
  saveBlob(bytes, `${safeBaseName}_bayynah_report.pdf`);
}
