// Responsibility: In-shell wrapper to view one cadet's Digital Twin from the ANO
//   Command Center, with a back link (keeps the ANO sidebar/topbar around it).
//   Renders the 3D Digital Twin experience (embedded). Route contract unchanged:
//   /ano/command/cadet/:regimentalNo.
// Layer: Command Center UI (Layer 4).
// Depends on: react-router-dom (Link), DigitalTwin/DigitalTwinExperience, commandCenter.css.
// Must never be depended on by: backend code or the Intelligence/Decision layers.

import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DigitalTwinExperience from "./DigitalTwin/DigitalTwinExperience";
import "./commandCenter.css";

export default function CommandCadetView() {
  return (
    <div className="cc-cadet-detail">
      <Link to="/ano/command" className="cc-back">
        <ArrowLeft size={16} /> Back to Command Center
      </Link>
      <DigitalTwinExperience embedded />
    </div>
  );
}
