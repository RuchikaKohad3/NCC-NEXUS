// Responsibility: The detail panel opened when a pillar callout is clicked. Shows
//   score, trend, confidence, the pillar explanation and a curated evidence grid.
//   Evidence fields are whitelisted per pillar so internal tuning params never leak,
//   and only fields actually present are shown (no fabrication).
// Layer: Command Center UI (Layer 4).

import React, { useEffect } from "react";
import { X } from "lucide-react";

const pct = (v) => (v == null ? null : `${Math.round(v * 100)}%`);
const int = (v) => (v == null ? null : `${Math.round(v)}`);

// Friendly, whitelisted evidence per pillar: [evidenceKey, label, formatter].
const FIELDS = {
  attendance: [
    ["presentCount", "Present", int],
    ["absentCount", "Absent", int],
    ["scorableDrills", "Drills assessed", int],
    ["excusedLeaves", "Excused leave", int],
    ["rawPresentRate", "Raw rate", pct],
  ],
  knowledge: [
    ["scoredAttempts", "Attempts scored", int],
    ["averageAccuracy", "Avg accuracy", (v) => (v == null ? null : `${Math.round(v)}%`)],
    ["consistency", "Consistency", int],
    ["topicsCovered", "Topics covered", int],
    ["voidedByViolation", "Voided (violation)", int],
  ],
  discipline: [
    ["finesOutstanding", "Fines outstanding", int],
    ["finesPaid", "Fines paid", int],
    ["violations", "Violations", int],
    ["unexcusedAbsences", "Unexcused absences", int],
  ],
  participation: [
    ["meetingsAttended", "Meetings attended", int],
    ["meetingsInvited", "Meetings invited", int],
    ["communityEvents", "Community activity", int],
  ],
  leadership: [
    ["rankIndex", "Rank position", int],
    ["responsibilityActions", "Responsibilities", int],
    ["influenceCount", "Influence", int],
    ["promotions", "Promotions", int],
  ],
};

function evidenceRows(pillar) {
  const ev = pillar.evidence || {};
  const spec = FIELDS[pillar.key] || [];
  return spec
    .map(([key, label, fmt]) => {
      const raw = ev[key];
      if (raw == null) return null;
      const val = fmt ? fmt(raw) : String(raw);
      return val == null ? null : { label, val };
    })
    .filter(Boolean);
}

function band(s) {
  if (s == null) return "none";
  if (s >= 75) return "good";
  if (s >= 50) return "warn";
  return "bad";
}

export default function DigitalTwinPillarDetail({ pillar, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pillar) return null;
  const rows = evidenceRows(pillar);
  const scorePct = pillar.score == null ? 0 : Math.max(0, Math.min(100, pillar.score));

  return (
    <div className="dt-detail-backdrop" onClick={onClose}>
      <div className="dt-detail" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="dt-detail-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="dt-detail-kicker">{pillar.label} Intelligence</div>

        <div className="dt-detail-scorewrap">
          <div className={`dt-detail-score b-${band(pillar.score)}`}>
            {pillar.score == null ? "—" : Math.round(pillar.score)}
            <span>/100</span>
          </div>
          <div className="dt-detail-meta">
            <span className={`dt-trend dt-trend-${pillar.trend.dir}`}>{pillar.trend.label}</span>
            {pillar.confidence != null && (
              <span className="dt-detail-conf">Confidence {Math.round(pillar.confidence * 100)}%</span>
            )}
          </div>
        </div>

        <div className="dt-detail-bar">
          <div className={`dt-detail-bar-fill b-${band(pillar.score)}`} style={{ width: `${scorePct}%` }} />
        </div>

        {pillar.explanation && <p className="dt-detail-explain">{pillar.explanation}</p>}

        {rows.length > 0 && (
          <div className="dt-detail-grid">
            {rows.map((r) => (
              <div key={r.label} className="dt-detail-cell">
                <span>{r.label}</span>
                <b>{r.val}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
