// Responsibility: Camera interaction for the Digital Twin — smooth damped orbit
//   (drag to rotate 360°, limited vertical tilt, scroll/pinch zoom), no panning,
//   with an imperative reset exposed via a ref for the "Reset View" button and
//   double-click. The avatar rotates; the 2D callout layer stays fixed (it lives
//   outside the <Canvas>).
// Layer: Command Center UI (Layer 4) — inside the R3F <Canvas>.

import React from "react";
import { OrbitControls } from "@react-three/drei";

export default function DigitalTwinControls({ controlsRef }) {
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, 1.0, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={0.7}
      zoomSpeed={0.7}
      minDistance={2.1}
      maxDistance={5.5}
      // limit vertical tilt so the cadet is never viewed from extreme angles
      minPolarAngle={Math.PI * 0.28}
      maxPolarAngle={Math.PI * 0.62}
    />
  );
}
