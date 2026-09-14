// Responsibility: The fixed 2D intelligence-callout layer that sits OVER the 3D
//   canvas (it never rotates with the avatar). Renders each pillar as a compact
//   panel + thin animated connector + glowing node anchored to the approximate
//   body region, with hover-expand, a body-region highlight halo, and click-to-open.
// Layer: Command Center UI (Layer 4). Data comes pre-mapped from useTwinData.

import React, { useState } from "react";
import { GraduationCap, ShieldCheck, CalendarDays, Users, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";

const ICONS = {
  knowledge: GraduationCap,
  discipline: ShieldCheck,
  attendance: CalendarDays,
  participation: Users,
  leadership: Star,
};

// Approximate on-screen body-region anchors (% of stage) for the highlight halo.
const REGION = {
  head: { x: 50, y: 19 },
  "left-arm": { x: 37, y: 47 },
  "right-arm": { x: 63, y: 47 },
  lower: { x: 50, y: 75 },
  flank: { x: 63, y: 33 },
};

function band(s) {
  if (s == null) return "none";
  if (s >= 75) return "good";
  if (s >= 50) return "warn";
  return "bad";
}

function TrendChip({ trend }) {
  const Icon = trend.dir === "up" ? TrendingUp : trend.dir === "down" ? TrendingDown : Minus;
  return (
    <span className={`dt-trend dt-trend-${trend.dir}`}>
      {trend.dir !== "none" && <Icon size={12} />}
      {trend.label}
    </span>
  );
}

function PillarCallout({ pillar, index, onHover, onSelect }) {
  const Icon = ICONS[pillar.key] || Star;
  return (
    <button
      className={`dt-callout dt-callout-${pillar.side} b-${band(pillar.score)}`}
      style={{ "--i": index }}
      onMouseEnter={() => onHover(pillar.region)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(pillar.region)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(pillar)}
      aria-label={`${pillar.label} ${pillar.score == null ? "no data" : Math.round(pillar.score)}`}
    >
      <span className="dt-connector">
        <span className="dt-line" />
        <span className="dt-node" />
      </span>
      <span className="dt-callout-panel">
        <span className="dt-callout-head">
          <span className="dt-callout-ic"><Icon size={14} /></span>
          <span className="dt-callout-name">{pillar.label}</span>
          <span className={`dt-callout-score b-${band(pillar.score)}`}>
            {pillar.score == null ? "—" : Math.round(pillar.score)}
          </span>
        </span>
        <TrendChip trend={pillar.trend} />
        <span className="dt-callout-expand">
          {pillar.confidence != null && (
            <span className="dt-callout-conf">
              Confidence {Math.round(pillar.confidence * 100)}%
            </span>
          )}
          <span className="dt-callout-explain">{pillar.explanation || "No detail available."}</span>
          <span className="dt-callout-cta">Click for detail →</span>
        </span>
      </span>
    </button>
  );
}

export default function DigitalTwinCallouts({ pillars = [], onSelect }) {
  const [hoverRegion, setHoverRegion] = useState(null);
  const left = pillars.filter((p) => p.side === "left");
  const right = pillars.filter((p) => p.side === "right");

  return (
    <>
      {/* body-region highlight halos */}
      {Object.entries(REGION).map(([region, pos]) => (
        <span
          key={region}
          className={`dt-halo ${hoverRegion === region ? "on" : ""}`}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        />
      ))}

      <div className="dt-rail dt-rail-left">
        {left.map((p, i) => (
          <PillarCallout key={p.key} pillar={p} index={i} onHover={setHoverRegion} onSelect={onSelect} />
        ))}
      </div>
      <div className="dt-rail dt-rail-right">
        {right.map((p, i) => (
          <PillarCallout key={p.key} pillar={p} index={i} onHover={setHoverRegion} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
}
