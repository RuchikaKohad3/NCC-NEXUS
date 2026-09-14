// Responsibility: The central OVERALL READINESS display — an animated radial gauge
//   with the score, a confidence indicator and a status label (Camp Ready /
//   Developing / At Risk). Anchored near the chest by the stage layout.
// Layer: Command Center UI (Layer 4). Pure presentation of pre-mapped data.

import React from "react";

function ring(score) {
  if (score == null) return "#8b90a8";
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

export default function DigitalTwinReadiness({ overall }) {
  const score = overall?.score;
  const status = overall?.status || { key: "none", label: "No data" };
  const conf = overall?.confidence == null ? null : Math.round(overall.confidence * 100);

  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const offset = c * (1 - pct / 100);
  const color = ring(score);

  return (
    <div className={`dt-readiness status-${status.key}`}>
      <div className="dt-readiness-glow" style={{ "--rc": color }} />
      <svg width="140" height="140" viewBox="0 0 140 140" className="dt-readiness-svg">
        <circle cx="70" cy="70" r={r} className="dt-readiness-track" />
        <circle
          cx="70"
          cy="70"
          r={r}
          className="dt-readiness-value"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="dt-readiness-center">
        <div className="dt-readiness-label">Overall Readiness</div>
        <div className="dt-readiness-num" style={{ color }}>
          {score == null ? "—" : Math.round(score)}
          <span>/100</span>
        </div>
        <div className={`dt-readiness-status status-${status.key}`}>{status.label}</div>
        {conf != null && <div className="dt-readiness-conf">Confidence {conf}%</div>}
      </div>
    </div>
  );
}
