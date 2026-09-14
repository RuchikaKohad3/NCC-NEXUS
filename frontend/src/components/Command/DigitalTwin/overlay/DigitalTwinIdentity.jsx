// Responsibility: The cadet identity panel — name, rank (as a UI badge, never a
//   fabricated 3D insignia), regimental number. Only fields actually present are
//   shown; missing identity data (wing, certificate, college name) is hidden, not
//   invented, because those columns do not exist in cadet_profiles today.
// Layer: Command Center UI (Layer 4).

import React from "react";
import { BadgeCheck } from "lucide-react";

export default function DigitalTwinIdentity({ identity }) {
  const name = identity?.name?.trim();
  const rank = identity?.rank?.trim();
  const regNo = identity?.regNo;

  return (
    <div className="dt-identity">
      <div className="dt-identity-kicker">
        <BadgeCheck size={13} /> Digital Twin
      </div>
      <h2 className="dt-identity-name">{name || "Cadet"}</h2>
      {rank && <div className="dt-identity-rank">{rank}</div>}
      {regNo && (
        <div className="dt-identity-field">
          <span>Regimental No.</span>
          <b className="dt-mono">{regNo}</b>
        </div>
      )}
    </div>
  );
}
