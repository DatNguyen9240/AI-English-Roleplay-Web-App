import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils } from "three";
import { RecordingStatus } from "shared-contracts";

interface CameraManagerProps {
  status: RecordingStatus;
}

export const CameraManager = ({ status }: CameraManagerProps) => {
  const controls = useThree((state) => (state as any).controls) as CameraControls | null;
  const locked = useRef(false);
  const motionUpdateAccumulator = useRef(0);

  useEffect(() => {
    if (!controls) return;

    controls.setLookAt(0, 2.5, 15, 0, 2, 0);

    const onStart = () => {
      locked.current = true;
    };

    const onEnd = () => {
      locked.current = false;
    };
    controls.addEventListener("controlstart", onStart);
    controls.addEventListener("controlend", onEnd);

    return () => {
      if (!controls) return;
      controls.removeEventListener("controlstart", onStart);
      controls.removeEventListener("controlend", onEnd);
    };
  }, [controls]);

  useEffect(() => {
    if (!controls) return;
    if (status === "SPEAKING") {
      controls.setLookAt(2, 2.5, 10, 0, 1.5, 0, true);
    } else if (status === "THINKING" || status === "PROCESSING") {
      controls.setLookAt(2, 2, 20, 0, 1.5, 0, true);
    } else if (status === "LISTENING") {
      controls.setLookAt(0, 2.5, 12, 0, 1.5, 0, true);
    } else {
      controls.setLookAt(0, 2, 15, 0, 1.5, 0, true);
    }
  }, [controls, status]);

  useFrame((state, delta) => {
    motionUpdateAccumulator.current += delta;
    if (motionUpdateAccumulator.current < 1 / 30) return;

    const lockedDelta = Math.max(Math.min(motionUpdateAccumulator.current, 0.5), 0);
    motionUpdateAccumulator.current = 0;
    const t = state.clock.elapsedTime;
    if (locked.current) return;
    if (!controls) return;
    controls.polarAngle = MathUtils.lerp(
      controls.polarAngle,
      Math.PI / 2 + Math.sin(t / 3) * MathUtils.degToRad(3),
      lockedDelta
    );
    controls.azimuthAngle = MathUtils.lerp(
      controls.azimuthAngle,
      Math.cos(t / 4) * MathUtils.degToRad(8),
      lockedDelta
    );
  });

  return (
    <CameraControls
      makeDefault
      maxAzimuthAngle={MathUtils.degToRad(30)}
      minAzimuthAngle={MathUtils.degToRad(-30)}
      minPolarAngle={MathUtils.degToRad(10)}
      maxPolarAngle={MathUtils.degToRad(90)}
      maxDistance={20}
      minDistance={5}
    />
  );
};
