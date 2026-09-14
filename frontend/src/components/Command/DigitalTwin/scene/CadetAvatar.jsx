// Responsibility: The gender-aware cadet avatar abstraction. Resolves the correct
//   GLB by gender, probes for it, lazy-loads it, and drives the animation contract
//   (Idle / Attention / Salute). If the asset is missing or fails, it falls back to
//   the procedural cadet — never a crash, never a blank. Dropping the real GLBs into
//   /public/models/cadets/ requires NO other code change.
// Layer: Command Center UI (Layer 4) — inside the R3F <Canvas>.
//
// Production assets (see /public/models/README.md):
//   /models/cadets/male-cadet.glb
//   /models/cadets/female-cadet.glb
// Required animation clip names: "Idle", "Attention", "Salute".
// Opening sequence: Attention → Salute (once) → Idle (loop).

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { LoopOnce } from "three";
import ProceduralCadet from "./ProceduralCadet";

const MODEL_BY_GENDER = {
  male: "/models/cadets/male-cadet.glb",
  female: "/models/cadets/female-cadet.glb",
};

export function resolveCadetModelUrl(gender) {
  return MODEL_BY_GENDER[gender] || MODEL_BY_GENDER.male;
}

// ── GLB path: plays the animation contract when the real asset exists ──
function GLBCadet({ url, salute }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions, names, mixer } = useAnimations(animations, group);
  const played = useRef(false);

  // Map the required clip names, with graceful aliases + fallbacks.
  const clips = useMemo(() => {
    const find = (re) => names.find((n) => re.test(n));
    return {
      idle: find(/idle|breath/i) || find(/attention|savdhan/i) || names[0],
      attention: find(/attention|savdhan/i) || find(/idle|breath/i) || names[0],
      salute: find(/salute/i) || null,
    };
  }, [names]);

  useEffect(() => {
    if (!actions) return undefined;
    const idle = clips.idle && actions[clips.idle];
    const attention = clips.attention && actions[clips.attention];
    const sal = clips.salute && actions[clips.salute];

    let onFinished;
    if (salute && sal && !played.current) {
      // Attention → Salute (once) → Idle
      played.current = true;
      if (attention) attention.reset().fadeIn(0.25).play();
      sal.reset();
      sal.setLoop(LoopOnce, 1);
      sal.clampWhenFinished = true;
      sal.fadeIn(0.25).play();
      onFinished = (e) => {
        if (e.action !== sal) return;
        sal.fadeOut(0.35);
        const next = idle || attention;
        if (next) next.reset().fadeIn(0.35).play();
      };
      if (mixer) mixer.addEventListener("finished", onFinished);
    } else if (idle) {
      idle.reset().fadeIn(0.3).play();
    } else if (attention) {
      attention.reset().fadeIn(0.3).play();
    }
    // If the GLB has no clips at all, it simply stands in its bind pose — no crash.

    return () => {
      if (mixer && onFinished) mixer.removeEventListener("finished", onFinished);
      [idle, attention, sal].forEach((a) => a && a.fadeOut(0.2));
    };
  }, [actions, mixer, clips, salute]);

  return <primitive ref={group} object={scene} dispose={null} />;
}

// Any GLB load/parse/runtime failure → the procedural cadet (never a blank).
class CadetBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    if (this.props.onFallback) this.props.onFallback();
  }
  render() {
    if (this.state.failed) {
      return <ProceduralCadet gender={this.props.gender} salute={this.props.salute} />;
    }
    return this.props.children;
  }
}

/**
 * @param {{gender?: 'male'|'female', salute?: boolean, onFallback?: Function}} props
 */
export default function CadetAvatar({ gender = "male", salute = true, onFallback }) {
  const url = resolveCadetModelUrl(gender);
  const [available, setAvailable] = useState(null); // null=checking

  // Probe for the real asset before attempting useGLTF. In dev, Vite serves
  // index.html for a missing .glb, which makes the loader throw — the probe
  // avoids that entirely: no asset → procedural fallback, reliably.
  useEffect(() => {
    let alive = true;
    setAvailable(null);
    fetch(url, { method: "HEAD" })
      .then((res) => {
        const ct = res.headers.get("content-type") || "";
        if (alive) setAvailable(res.ok && !ct.includes("text/html"));
      })
      .catch(() => {
        if (alive) setAvailable(false);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    if (available === false && onFallback) onFallback();
  }, [available, onFallback]);

  if (available === true) {
    return (
      <CadetBoundary gender={gender} salute={salute} onFallback={onFallback}>
        <Suspense fallback={<ProceduralCadet gender={gender} salute={salute} />}>
          <GLBCadet url={url} salute={salute} />
        </Suspense>
      </CadetBoundary>
    );
  }

  // Checking or unavailable → procedural fallback (production GLB pending).
  return <ProceduralCadet gender={gender} salute={salute} />;
}
