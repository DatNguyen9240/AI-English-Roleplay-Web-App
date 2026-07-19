import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SkinnedMesh, MathUtils, Object3D } from "three";
import { VISEMES } from "wawa-lipsync";
import { RecordingStatus } from "shared-contracts";

interface CharacterProps {
  status: RecordingStatus;
  useBrowserTts: boolean;
  lipsyncManager: any;
  onReady?: () => void;
  [key: string]: any;
}

export const Character = ({ status, useBrowserTts, lipsyncManager, onReady, ...props }: CharacterProps) => {
  const { scene, animations } = useGLTF("models/Santa.glb");
  const renderedFramesRef = useRef(0);
  const morphUpdateAccumulatorRef = useRef(0);

  const { actions, mixer } = useAnimations(animations, scene);

  const [animation, setAnimation] = useState("Idle");

  useEffect(() => {
    const action = {
      SPEAKING: ["Talking", "Talking 2 ", "Talking 3"][MathUtils.randInt(0, 2)],
      THINKING: "Thinking",
      PROCESSING: "Thinking",
      LISTENING: "Idle", // Or a custom listening active posture if available
      IDLE: "Idle",
      ERROR: "Idle",
    }[status] || "Idle";

    setAnimation(action);
  }, [status]);

  useEffect(() => {
    if (mixer.time < 0.01) {
      actions[animation]?.reset().play();
    } else {
      actions[animation]?.reset().fadeIn(0.5).play();
    }
    return () => {
      actions[animation]?.fadeOut(0.5);
    };
  }, [animation, actions]);

  // Blend Shapes
  const avatarSkinnedMeshes = useMemo(() => {
    const skinnedMeshes: SkinnedMesh[] = [];
    scene.traverse((child: Object3D) => {
      if ((child as any).isSkinnedMesh) {
        skinnedMeshes.push(child as SkinnedMesh);
      }
    });
    return skinnedMeshes;
  }, [scene]);

  const lerpMorphTarget = useCallback(
    (target: string, value: number, speed = 0.1) => {
      avatarSkinnedMeshes.forEach((skinnedMesh) => {
        if (!skinnedMesh.morphTargetDictionary) {
          return;
        }
        const morphIndex = skinnedMesh.morphTargetDictionary[target];
        if (morphIndex !== undefined && skinnedMesh.morphTargetInfluences) {
          const currentValue = skinnedMesh.morphTargetInfluences[morphIndex];
          skinnedMesh.morphTargetInfluences[morphIndex] = MathUtils.lerp(
            currentValue,
            value,
            speed
          );
        }
      });
    },
    [avatarSkinnedMeshes]
  );

  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 150);
      }, MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  useFrame((state, delta) => {
    // useGLTF resolving only proves that the file is decoded. Wait until the
    // model has actually rendered twice so GPU buffers and shaders are warm.
    if (onReady && renderedFramesRef.current < 2) {
      renderedFramesRef.current += 1;
      if (renderedFramesRef.current === 2) {
        onReady();
      }
    }

    // Morph targets are visually smooth at 30fps while updating them at every
    // render frame is expensive on a skinned GLB with many visemes.
    morphUpdateAccumulatorRef.current += delta;
    if (morphUpdateAccumulatorRef.current < 1 / 30) return;
    morphUpdateAccumulatorRef.current = 0;

    // 1. Blink
    lerpMorphTarget("eyeBlinkLeft", blink ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink ? 1 : 0, 0.5);

    // 2. Lip sync
    if (status === "SPEAKING") {
      if (useBrowserTts) {
        // Emulated Lip Sync for Browser speech synthesis
        const t = state.clock.elapsedTime;
        const mouthOpen = Math.abs(Math.sin(t * 15)) * 0.8;
        
        lerpMorphTarget("viseme_aa", mouthOpen, 0.25);
        lerpMorphTarget("viseme_O", mouthOpen * 0.5, 0.25);
        lerpMorphTarget("viseme_sil", 1 - mouthOpen, 0.25);
        
        Object.values(VISEMES).forEach((viseme) => {
          if (viseme !== "viseme_aa" && viseme !== "viseme_O" && viseme !== "viseme_sil") {
            lerpMorphTarget(viseme as string, 0, 0.25);
          }
        });
      } else if (lipsyncManager) {
        // Real-time Web Audio analyzer Lip Sync
        lipsyncManager.processAudio();
        const currentViseme = lipsyncManager.viseme;
        Object.values(VISEMES).forEach((viseme) => {
          lerpMorphTarget(viseme as string, viseme === currentViseme ? 1 : 0, 0.2);
        });
      }
    } else {
      // Silence mouth pose
      lerpMorphTarget("viseme_sil", 1, 0.25);
      Object.values(VISEMES).forEach((viseme) => {
        if (viseme !== "viseme_sil") {
          lerpMorphTarget(viseme as string, 0, 0.25);
        }
      });
    }
  });

  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  );
};

useGLTF.preload("models/Santa.glb");
