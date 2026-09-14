// Responsibility: Restrained at-risk indicator. Rendered only when the Decision
//   layer flags this cadet (staff view). Shows severity, drivers and the
//   recommended action — never fabricated, never an alarming full-screen HUD.
// Layer: Command Center UI (Layer 4).

import React from "react";
import { AlertTriangle } from "lucide-react";

export default function DigitalTwinRisk({ risk }) {
  if (!risk) return null;
  const severity = String(risk.severity || "medium").toLowerCase();
  const drivers = Array.isArray(risk.drivers) ? risk.drivers : [];

  return (
    <div className={`dt-risk sev-${severity}`}>
      <div className="dt-risk-head">
        <AlertTriangle size={15} />
        <span>At Risk</span>
        <span className="dt-risk-sev">{severity}</span>
      </div>
      {drivers.length > 0 && (
        <ul className="dt-risk-drivers">
          {drivers.slice(0, 3).map((d, i) => (
            <li key={i} title={d.detail || ""}>{d.label || d.code}</li>
          ))}
        </ul>
      )}
      {risk.recommendedAction && (
        <div className="dt-risk-action">
          <span>Recommended</span>
          <p>{risk.recommendedAction}</p>
        </div>
      )}
    </div>
  );
}
