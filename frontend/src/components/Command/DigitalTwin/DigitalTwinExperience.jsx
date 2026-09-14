// Responsibility: Top-level orchestrator for the 3D Digital Twin experience.
//   Owns data (useTwinData), the premium initialization sequence, error / no-snapshot
//   fallbacks, the lazy-loaded 3D scene, the fixed overlay (identity, callouts,
//   readiness, risk), camera reset, the salute-once guard and responsive layout.
//   Presentation only — no readiness math, existing routes/APIs untouched.
// Layer: Command Center UI (Layer 4).
// Route: /ano/command/cadet/:regimentalNo (ANO) and /twin[/:regimentalNo] (self).

import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { RotateCcw, RefreshCw, AlertTriangle, Sparkles, CloudOff } from "lucide-react";
import { useTwinData } from "./useTwinData";
import DigitalTwinIdentity from "./overlay/DigitalTwinIdentity";
import DigitalTwinReadiness from "./overlay/DigitalTwinReadiness";
import DigitalTwinRisk from "./overlay/DigitalTwinRisk";
import DigitalTwinCallouts from "./overlay/DigitalTwinCallouts";
import DigitalTwinPillarDetail from "./overlay/DigitalTwinPillarDetail";
import "./digitalTwin.css";

// three.js stays out of the main bundle — loaded only when the Twin opens.
const DigitalTwinScene = lazy(() => import("./scene/DigitalTwinScene"));

// If WebGL / the 3D scene fails for any reason, never blank the screen — the
// intelligence overlay (callouts, readiness, identity) still renders on top.
class SceneBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, message: "" };
  }
  static getDerivedStateFromError(err) {
    return { failed: true, message: (err && err.message) || String(err) };
  }
  componentDidCatch(err) {
    // eslint-disable-next-line no-console
    console.error("[DigitalTwin scene error]", err);
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="dt-canvas-note">
          <b>3D view could not start</b>
          <span>{this.state.message}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// WebGL capability probe — a blank canvas is most often a WebGL/GPU problem.
function webglSupported() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function InitSequence() {
  return (
    <div className="dt-init">
      <div className="dt-init-brand">DIGITAL TWIN</div>
      <div className="dt-init-sub">INITIALIZING</div>
      <ul className="dt-init-lines">
        <li style={{ "--d": "0.15s" }}><span>Identity</span><b>VERIFIED</b></li>
        <li style={{ "--d": "0.55s" }}><span>Readiness</span><b>SYNCED</b></li>
        <li style={{ "--d": "0.95s" }}><span>Intelligence</span><b>ONLINE</b></li>
      </ul>
    </div>
  );
}

export default function DigitalTwinExperience({ embedded = false, gender = "male" }) {
  const params = useParams();
  const {
    reg,
    loading,
    error,
    needsCompute,
    recomputing,
    identity,
    risk,
    view,
    reload,
    recompute,
  } = useTwinData(params.regimentalNo);

  const controlsRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [glbPending, setGlbPending] = useState(false);

  // Salute plays once per cadet per browser session (prevents remount replay).
  const [salute] = useState(() => {
    if (!reg) return true;
    const key = `dt_saluted_${reg}`;
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, "1");
      return true;
    } catch {
      return true;
    }
  });

  // Premium init: hold the sequence until data resolves AND a short minimum.
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 1150);
    return () => clearTimeout(t);
  }, []);
  const booting = loading || !minElapsed;

  const resetView = () => controlsRef.current?.reset?.();

  const pillars = useMemo(() => view?.pillars || [], [view]);

  return (
    <div className={`dt-experience ${embedded ? "dt-embedded" : "dt-standalone"}`}>
      {/* premium initialization overlay */}
      {booting && <InitSequence />}

      {/* ERROR (readiness could not load / not authorised) */}
      {!booting && error && (
        <div className="dt-fallback">
          <div className="dt-fallback-ic dt-fallback-err"><AlertTriangle size={26} /></div>
          <h3>Digital Twin unavailable</h3>
          <p>{error}</p>
          <button className="dt-btn" onClick={reload}>Try again</button>
        </div>
      )}

      {/* NO SNAPSHOT YET */}
      {!booting && needsCompute && !error && (
        <div className="dt-fallback">
          <div className="dt-fallback-ic"><Sparkles size={26} /></div>
          <h3>No readiness snapshot yet</h3>
          <p>Generate the first snapshot to bring this cadet's Digital Twin online.</p>
          <button className="dt-btn" onClick={recompute} disabled={recomputing}>
            <RefreshCw size={15} className={recomputing ? "dt-spin" : ""} />
            {recomputing ? "Computing…" : "Compute readiness"}
          </button>
        </div>
      )}

      {/* THE EXPERIENCE */}
      {!booting && view && !error && (
        <div className="dt-stage" onDoubleClick={resetView}>
          {/* 3D scene (rotatable) */}
          <div className="dt-canvas">
            {webglSupported() ? (
              <SceneBoundary>
                <Suspense fallback={<div className="dt-canvas-loading" />}>
                  <DigitalTwinScene
                    salute={salute}
                    gender={gender}
                    controlsRef={controlsRef}
                    onFallback={() => setGlbPending(true)}
                  />
                </Suspense>
              </SceneBoundary>
            ) : (
              <div className="dt-canvas-note">
                <b>3D not available in this browser</b>
                <span>WebGL appears to be disabled. Enable hardware acceleration in your browser settings, then reload.</span>
              </div>
            )}
          </div>

          {/* fixed overlay — never rotates with the model */}
          <div className="dt-overlay">
            <DigitalTwinIdentity identity={identity} />
            <DigitalTwinRisk risk={risk} />
            <DigitalTwinCallouts pillars={pillars} onSelect={setSelected} />
            <div className="dt-center"><DigitalTwinReadiness overall={view.overall} /></div>

            {/* mobile intelligence rail (side callouts hidden on small screens) */}
            <div className="dt-mobile-rail">
              {pillars.map((p) => (
                <button key={p.key} className="dt-chip" onClick={() => setSelected(p)}>
                  <span>{p.label}</span>
                  <b>{p.score == null ? "—" : Math.round(p.score)}</b>
                </button>
              ))}
            </div>

            {/* toolbar */}
            <div className="dt-toolbar">
              {glbPending && (
                <span className="dt-asset-chip" title="Reference avatar shown until the NCC GLB is provided">
                  <CloudOff size={13} /> Reference avatar · NCC model pending
                </span>
              )}
              <button className="dt-tool-btn" onClick={resetView} title="Reset view">
                <RotateCcw size={14} /> Reset View
              </button>
              <button className="dt-tool-btn" onClick={recompute} disabled={recomputing} title="Recompute readiness">
                <RefreshCw size={14} className={recomputing ? "dt-spin" : ""} />
                {recomputing ? "Computing…" : "Recompute"}
              </button>
            </div>

            <div className="dt-hint">Drag to rotate · scroll to zoom · double-click to reset</div>
          </div>

          {/* click-through pillar detail */}
          {selected && <DigitalTwinPillarDetail pillar={selected} onClose={() => setSelected(null)} />}
        </div>
      )}
    </div>
  );
}
