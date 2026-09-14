// Responsibility: Procedural fallback cadet — "procedural fallback, production GLB
//   pending". Deliberately simple (primitives only): it exists so the Twin is never
//   blank while the real GLBs are sourced. Colours follow the NCC Army-wing
//   reference (khaki, dark-green beret + red plume + silver badge, black belt +
//   silver NCC buckle, red NCC shoulder flash, name tag, maroon lanyard). It is
//   gender-aware (male/female proportions + hair bun) but NOT meant to look like a
//   production human — that quality comes from the GLB assets.
// Layer: Command Center UI (Layer 4) — inside the R3F <Canvas>.

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

// Restrained salute envelope (seconds) → 0..1..0. precision > drama.
function saluteEnvelope(t) {
  const smooth = (x) => {
    const c = Math.max(0, Math.min(1, x));
    return c * c * (3 - 2 * c);
  };
  if (t < 0.5) return 0; // hold Savdhan / Attention
  if (t < 1.5) return smooth((t - 0.5) / 1.0); // raise
  if (t < 2.0) return 1; // hold salute
  if (t < 2.8) return 1 - smooth((t - 2.0) / 0.8); // return
  return 0;
}

export default function ProceduralCadet({ gender = "male", salute = true }) {
  const root = useRef();
  const head = useRef();
  const shoulder = useRef();
  const elbow = useRef();
  const t0 = useRef(null);

  const female = gender === "female";
  const torsoR = female ? 0.212 : 0.235;
  const armSeamX = female ? -0.3 : -0.325;
  const saluteShoulderX = female ? 0.27 : 0.295;
  const shoulderX = female ? 0.185 : 0.2;

  // NCC Army-wing reference palette.
  const uniform = useMemo(() => ({ color: "#a89a63", roughness: 0.85, metalness: 0.02 }), []);
  const uniformDark = useMemo(() => ({ color: "#8d7f4e", roughness: 0.88, metalness: 0.02 }), []);
  const skin = useMemo(() => ({ color: "#c69a72", roughness: 0.6, metalness: 0 }), []);
  const hair = useMemo(() => ({ color: "#20160f", roughness: 0.8, metalness: 0 }), []);
  const beret = useMemo(() => ({ color: "#22402c", roughness: 0.72, metalness: 0.04 }), []); // dark green
  const belt = useMemo(() => ({ color: "#16171c", roughness: 0.5, metalness: 0.2 }), []);
  const boot = useMemo(() => ({ color: "#111318", roughness: 0.42, metalness: 0.25 }), []);
  const silver = useMemo(() => ({ color: "#cdd2da", roughness: 0.3, metalness: 0.75, emissive: "#20242c", emissiveIntensity: 0.1 }), []);
  const nccRed = useMemo(() => ({ color: "#c0392b", roughness: 0.55, metalness: 0.05 }), []);
  const lanyard = useMemo(() => ({ color: "#6b1f3a", roughness: 0.6, metalness: 0.05 }), []); // maroon

  useFrame((state) => {
    const c = state.clock.elapsedTime;
    if (root.current) root.current.position.y = Math.sin(c * 1.3) * 0.012; // breathing
    if (head.current) head.current.rotation.y = Math.sin(c * 0.5) * 0.025; // stabilisation
    if (salute && shoulder.current && elbow.current) {
      if (t0.current == null) t0.current = c;
      const p = saluteEnvelope(c - t0.current);
      shoulder.current.rotation.z = -1.15 * p;
      shoulder.current.rotation.x = 0.28 * p;
      elbow.current.rotation.x = -2.05 * p;
    }
  });

  return (
    <group ref={root} position={[0, 0, 0]}>
      {/* trousers */}
      <mesh position={[-0.12, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.64, 6, 12]} />
        <meshStandardMaterial {...uniform} />
      </mesh>
      <mesh position={[0.12, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.64, 6, 12]} />
        <meshStandardMaterial {...uniform} />
      </mesh>
      {/* black polished shoes */}
      <mesh position={[-0.12, 0.05, 0.05]} castShadow>
        <boxGeometry args={[0.15, 0.09, 0.26]} />
        <meshStandardMaterial {...boot} />
      </mesh>
      <mesh position={[0.12, 0.05, 0.05]} castShadow>
        <boxGeometry args={[0.15, 0.09, 0.26]} />
        <meshStandardMaterial {...boot} />
      </mesh>

      {/* torso — khaki half-sleeve shirt */}
      <mesh position={[0, 1.04, 0]} castShadow>
        <capsuleGeometry args={[torsoR, 0.44, 8, 16]} />
        <meshStandardMaterial {...uniform} />
      </mesh>
      {/* two flapped chest pockets */}
      {[-0.11, 0.11].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.14, torsoR - 0.03]} castShadow>
            <boxGeometry args={[0.12, 0.13, 0.03]} />
            <meshStandardMaterial {...uniformDark} />
          </mesh>
          <mesh position={[x, 1.2, torsoR - 0.02]} castShadow>
            <boxGeometry args={[0.125, 0.035, 0.03]} />
            <meshStandardMaterial {...uniformDark} />
          </mesh>
        </group>
      ))}
      {/* black name plate (right chest) */}
      <mesh position={[0.11, 1.05, torsoR - 0.02]} castShadow>
        <boxGeometry args={[0.11, 0.03, 0.02]} />
        <meshStandardMaterial color="#0c0d12" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* maroon lanyard (diagonal across chest) */}
      <mesh position={[0.08, 1.08, torsoR - 0.04]} rotation={[0, 0, 0.9]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
        <meshStandardMaterial {...lanyard} />
      </mesh>
      {/* collar */}
      <mesh position={[0, 1.36, 0.03]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.08, 16]} />
        <meshStandardMaterial {...uniform} />
      </mesh>
      {/* black web belt + silver NCC buckle */}
      <mesh position={[0, 0.84, 0]} castShadow>
        <cylinderGeometry args={[torsoR + 0.012, torsoR + 0.012, 0.075, 24]} />
        <meshStandardMaterial {...belt} />
      </mesh>
      <mesh position={[0, 0.84, torsoR + 0.005]} castShadow>
        <boxGeometry args={[0.1, 0.07, 0.025]} />
        <meshStandardMaterial {...silver} />
      </mesh>

      {/* epaulettes + red NCC shoulder flash */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (shoulderX + 0.005), 1.27, 0]} rotation={[0, 0, -s * 0.18]} castShadow>
            <boxGeometry args={[0.16, 0.04, 0.11]} />
            <meshStandardMaterial {...uniformDark} />
          </mesh>
          <mesh position={[s * (shoulderX + 0.02), 1.25, 0.06]} castShadow>
            <boxGeometry args={[0.05, 0.03, 0.03]} />
            <meshStandardMaterial {...nccRed} />
          </mesh>
        </group>
      ))}

      {/* left arm at attention (sleeve + hand) */}
      <mesh position={[armSeamX, 1.0, 0]} rotation={[0, 0, 0.06]} castShadow>
        <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
        <meshStandardMaterial {...uniform} />
      </mesh>
      <mesh position={[armSeamX - 0.02, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.058, 12, 12]} />
        <meshStandardMaterial {...skin} />
      </mesh>

      {/* right arm group (salute arm) */}
      <group ref={shoulder} position={[saluteShoulderX, 1.24, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.32, 6, 12]} />
          <meshStandardMaterial {...uniform} />
        </mesh>
        <group ref={elbow} position={[0, -0.38, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow>
            <capsuleGeometry args={[0.064, 0.28, 6, 12]} />
            <meshStandardMaterial {...uniform} />
          </mesh>
          <mesh position={[0, -0.34, 0.02]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 0.12, 0.035]} />
            <meshStandardMaterial {...skin} />
          </mesh>
        </group>
      </group>

      {/* head + hair + dark-green beret */}
      <group ref={head} position={[0, 1.55, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.143, 24, 24]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        {/* hair — female: bun at the back */}
        {female && (
          <mesh position={[0, -0.02, -0.13]} castShadow>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshStandardMaterial {...hair} />
          </mesh>
        )}
        {/* beret (tilted) + stiffener band */}
        <mesh position={[0.03, 0.11, -0.01]} rotation={[0.08, 0, -0.2]} castShadow>
          <cylinderGeometry args={[0.172, 0.15, 0.09, 24]} />
          <meshStandardMaterial {...beret} />
        </mesh>
        <mesh position={[0, 0.055, 0]} castShadow>
          <cylinderGeometry args={[0.152, 0.152, 0.03, 24]} />
          <meshStandardMaterial {...beret} />
        </mesh>
        {/* silver NCC cap badge (left front) */}
        <mesh position={[-0.09, 0.12, 0.11]} rotation={[0, -0.3, 0]}>
          <circleGeometry args={[0.024, 16]} />
          <meshStandardMaterial {...silver} side={2} />
        </mesh>
        {/* red plume / hackle (above the badge) */}
        <mesh position={[-0.1, 0.22, 0.09]} castShadow>
          <coneGeometry args={[0.022, 0.11, 10]} />
          <meshStandardMaterial {...nccRed} />
        </mesh>
      </group>
    </group>
  );
}
