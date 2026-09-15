// Responsibility: Officer-ready PDF exports for the Command Center (M10) —
//   the cohort Readiness Brief and the Camp Selection Sheet (live board or a
//   confirmed M8.2b run). Pure jsPDF text/vector drawing: crisp print, small
//   files, no html2canvas rasterisation.
// Layer: Command Center UI (Layer 4) utility.
// Depends on: jspdf (already a project dependency — quizPdfExport pattern).
// Must never be depended on by: backend code.

import { jsPDF } from "jspdf";

// ── palette (mirrors the ANO shell tokens; PDFs are always light) ──
const INK = [26, 29, 46]; // --a-text
const MUTED = [110, 115, 140];
const NAVY = [26, 35, 126]; // --a-navy
const INDIGO = [92, 107, 192]; // --a-primary
const RED = [229, 57, 53]; // --a-red
const LINE = [225, 228, 240];
const TIER_COLORS = {
  selected: [46, 125, 50],
  standby: [245, 124, 0],
  not_selected: [110, 115, 140],
  unranked: [92, 107, 192],
};

const PAGE = { w: 595.28, h: 841.89, margin: 46 }; // A4 portrait, pt

const fmtDate = (value = new Date()) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const score1 = (v) => (v == null ? "—" : String(Math.round(Number(v))));
const conf1 = (v) => (v == null ? "—" : `${Math.round(Number(v) * 100)}%`);

function newDoc() {
  return new jsPDF({ unit: "pt", format: "a4" });
}

/** NCC tricolour rule + title block; returns the y to continue from. */
function drawHeader(doc, title, subtitle) {
  const { w, margin } = PAGE;
  const third = (w - margin * 2) / 3;
  doc.setFillColor(...RED);
  doc.rect(margin, 40, third, 4, "F");
  doc.setFillColor(...INDIGO);
  doc.rect(margin + third, 40, third, 4, "F");
  doc.setFillColor(...NAVY);
  doc.rect(margin + third * 2, 40, third, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...NAVY);
  doc.text("NCC NEXUS COMMAND", margin, 68);

  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(title, margin, 88);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, margin, 103);

  doc.setDrawColor(...LINE);
  doc.setLineWidth(1);
  doc.line(margin, 112, w - margin, 112);
  return 130;
}

function drawFooters(doc, label) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, PAGE.margin, PAGE.h - 24);
    doc.text(`Page ${i} of ${pages}`, PAGE.w - PAGE.margin, PAGE.h - 24, { align: "right" });
  }
}

function ensureRoom(doc, y, needed) {
  if (y + needed <= PAGE.h - 48) return y;
  doc.addPage();
  return 56;
}

/** Simple key-figure strip: [{label, value}] laid out on one row. */
function drawStats(doc, y, stats) {
  const { margin, w } = PAGE;
  const cellW = (w - margin * 2) / stats.length;
  stats.forEach((s, i) => {
    const x = margin + i * cellW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...NAVY);
    doc.text(String(s.value), x, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(s.label.toUpperCase(), x, y + 29);
  });
  return y + 48;
}

/**
 * Minimal table renderer: columns = [{key, label, w, align?, color?(row)}].
 * Handles page breaks and repeats the header row on each new page.
 */
function drawTable(doc, startY, columns, rows) {
  const { margin } = PAGE;
  let y = startY;

  const header = () => {
    doc.setFillColor(244, 245, 252);
    doc.rect(margin, y - 11, columns.reduce((a, c) => a + c.w, 0), 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    let x = margin;
    for (const col of columns) {
      doc.text(col.label.toUpperCase(), col.align === "right" ? x + col.w - 6 : x + 6, y, {
        align: col.align === "right" ? "right" : "left",
      });
      x += col.w;
    }
    y += 16;
  };

  header();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  for (const row of rows) {
    y = ensureRoom(doc, y, 18);
    if (y === 56) {
      header();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
    }
    let x = margin;
    for (const col of columns) {
      const raw = row[col.key];
      const value = raw == null || raw === "" ? "—" : String(raw);
      doc.setTextColor(...(col.color ? col.color(row) : INK));
      doc.text(value, col.align === "right" ? x + col.w - 6 : x + 6, y, {
        align: col.align === "right" ? "right" : "left",
        maxWidth: col.w - 12,
      });
      x += col.w;
    }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 5, margin + columns.reduce((a, c) => a + c.w, 0), y + 5);
    y += 17;
  }
  return y + 6;
}

const readinessColor = (row) => {
  const s = row.__score;
  if (s == null) return MUTED;
  if (s >= 75) return TIER_COLORS.selected;
  if (s >= 50) return TIER_COLORS.standby;
  return RED;
};

/**
 * Cohort Readiness Brief — one row per cadet, sorted as given.
 * @param {{rows:Array<object>, generatedBy?:string}} input rows =
 *   getCollegeReadiness output.
 */
export function exportReadinessBrief({ rows = [], generatedBy = "" }) {
  const doc = newDoc();
  let y = drawHeader(
    doc,
    "Unit Readiness Brief",
    `Generated ${fmtDate()}${generatedBy ? ` · by ${generatedBy}` : ""} · deterministic scoring, confidence-weighted`
  );

  const withSnap = rows.filter((r) => r.has_snapshot);
  const scores = withSnap.map((r) => r.overall_score).filter((s) => s != null);
  const avg = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : "—";

  y = drawStats(doc, y, [
    { label: "Cadets", value: rows.length },
    { label: "With snapshot", value: withSnap.length },
    { label: "Average readiness", value: avg },
    { label: "Camp ready (≥75)", value: scores.filter((s) => s >= 75).length },
    { label: "At risk (<50)", value: scores.filter((s) => s < 50).length },
  ]);

  const tableRows = rows.map((r) => ({
    reg: r.regimental_no,
    name: r.full_name || "—",
    rank: r.rank_name || "—",
    score: r.has_snapshot ? score1(r.overall_score) : "no data",
    conf: r.has_snapshot ? conf1(r.overall_confidence) : "—",
    __score: r.has_snapshot ? r.overall_score : null,
  }));

  y = drawTable(doc, y, [
    { key: "reg", label: "Reg. No", w: 92 },
    { key: "name", label: "Name", w: 178 },
    { key: "rank", label: "Rank", w: 108 },
    { key: "score", label: "Readiness", w: 70, align: "right", color: readinessColor },
    { key: "conf", label: "Confidence", w: 55, align: "right" },
  ], tableRows);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  y = ensureRoom(doc, y, 24);
  doc.text(
    "Scores are pure-function formulas over recorded data. Low confidence means thin evidence, never a penalty (ADL-005).",
    PAGE.margin,
    y + 8,
    { maxWidth: PAGE.w - PAGE.margin * 2 }
  );

  drawFooters(doc, "NCC NEXUS · Unit Readiness Brief");
  doc.save(`readiness-brief-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Camp Selection Sheet — works for a LIVE board result or a CONFIRMED run.
 * @param {{selection:object, runMeta?:object}} input selection = the recipe
 *   output shape; runMeta = { run_id, confirmed_at, profile } when persisted.
 */
export function exportSelectionSheet({ selection, runMeta = null }) {
  if (!selection) return;
  const doc = newDoc();

  const sub = runMeta
    ? `Confirmed roster · Run #${runMeta.run_id} · ${fmtDate(runMeta.confirmed_at)}`
    : `Live board (not yet confirmed) · Generated ${fmtDate()}`;
  let y = drawHeader(doc, `Camp Selection Sheet — ${String(selection.profile || "").toUpperCase()}`, sub);

  const s = selection.summary || {};
  y = drawStats(doc, y, [
    { label: "Slots", value: selection.slots ?? "—" },
    { label: "Reserves", value: selection.reserves ?? "—" },
    { label: "Eligible", value: s.eligibleCount ?? "—" },
    { label: "Cutoff", value: s.cutoffScore ?? "—" },
    { label: "Min gate", value: s.minReadiness ?? "none" },
  ]);

  if (selection.weights?.weights) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const w = selection.weights;
    const weightLine = Object.entries(w.weights)
      .map(([k, v]) => `${k} ${Math.round(v * 100)}%`)
      .join(" · ");
    doc.text(
      `Ranked under ${w.profile} weights (${w.source}${w.version ? ` v${w.version}` : ""}): ${weightLine}`,
      PAGE.margin,
      y
    );
    y += 18;
  }

  const tiers = [
    ["SELECTED", selection.selected, TIER_COLORS.selected],
    ["STANDBY / RESERVE", selection.standby, TIER_COLORS.standby],
    ["NOT SELECTED", selection.notSelected, TIER_COLORS.not_selected],
    ["UNRANKED — NO SNAPSHOT", selection.unranked, TIER_COLORS.unranked],
  ];

  for (const [title, list, color] of tiers) {
    if (!list || !list.length) continue;
    y = ensureRoom(doc, y, 40);
    doc.setFillColor(...color);
    doc.rect(PAGE.margin, y - 4, 3.5, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...color);
    doc.text(`${title} (${list.length})`, PAGE.margin + 10, y + 5);
    y += 18;

    y = drawTable(doc, y, [
      { key: "pos", label: "#", w: 28, align: "right" },
      { key: "reg", label: "Reg. No", w: 82 },
      { key: "name", label: "Name", w: 132 },
      { key: "score", label: "Score", w: 44, align: "right", color: readinessColor },
      { key: "why", label: "Reason / caveats", w: 217 },
    ], list.map((c) => {
      const caveats = (c.caveats || [])
        .map((x) => (typeof x === "string" ? x : x.label))
        .filter(Boolean);
      const reason = (c.reasons || [])[0] || "";
      return {
        pos: c.rank ?? c.rank_position ?? "—",
        reg: c.regimental_no,
        name: c.full_name || "—",
        score: score1(c.overall_score),
        why: [reason, caveats.length ? `⚠ ${caveats.join("; ")}` : ""].filter(Boolean).join(" "),
        __score: c.overall_score,
      };
    }));
    y += 4;
  }

  y = ensureRoom(doc, y, 60);
  doc.setDrawColor(...LINE);
  doc.line(PAGE.margin, y + 8, PAGE.margin + 180, y + 8);
  doc.line(PAGE.w - PAGE.margin - 180, y + 8, PAGE.w - PAGE.margin, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("Board President", PAGE.margin, y + 20);
  doc.text("ANO / Officer Commanding", PAGE.w - PAGE.margin, y + 20, { align: "right" });

  drawFooters(doc, "NCC NEXUS · Camp Selection Sheet — the system recommends, the board decides");
  const tag = runMeta ? `run-${runMeta.run_id}` : "live";
  doc.save(`selection-sheet-${selection.profile || "board"}-${tag}.pdf`);
}
