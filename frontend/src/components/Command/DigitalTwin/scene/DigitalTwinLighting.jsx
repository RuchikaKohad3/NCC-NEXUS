// Responsibility: Cinematic, realistic lighting for the Digital Twin avatar tuned
//   for the site's LIGHT environment — bright soft key + gentle fill + subtle cool
//   rim, procedural environment (Lightformers, NO external HDR/CDN → CSP-safe) and
//   a soft contact shadow. The uniform reads and the face is never lost.
// Layer: Command Center UI (Layer 4) — inside the R3F <Canvas>.

import React from "react";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";

export default function DigitalTwinLighting() {
  return (
    <>
      {/* generous ambient for a light scene */}
      <ambientLight intensity={0.75} color="#eef1fb" />

      {/* soft key light (front-right, casts the contact-supported shadow) */}
      <directionalLight
        position={[3.2, 5.5, 4]}
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
      >
        <orthographicCamera attach="shadow-camera" args={[-3, 3, 3, -3, 0.1, 20]} />
      </directionalLight>

      {/* gentle front fill so the face stays readable */}
      <directionalLight position={[-1.5, 2, 5]} intensity={0.9} color="#dfe6ff" />

      {/* subtle cool rim (back-left) for a premium edge */}
      <directionalLight position={[-4, 4, -3]} intensity={0.7} color="#8aa8ff" />

      {/* procedural environment for soft reflections — no external file */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={1.4} position={[0, 3, 3]} scale={[6, 3, 1]} color="#ffffff" />
        <Lightformer intensity={0.8} position={[-4, 1, -2]} scale={[3, 4, 1]} color="#c9d6ff" />
        <Lightformer intensity={0.6} position={[4, 1, -1]} scale={[3, 4, 1]} color="#e8edff" />
      </Environment>

      {/* soft contact shadow grounding the cadet on the light floor */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.32}
        scale={7}
        blur={2.8}
        far={4}
        resolution={512}
        color="#26315e"
      />
    </>
  );
}
