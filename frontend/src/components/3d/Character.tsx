import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MeshPhysicalMaterial, SkinnedMesh } from "three";
import { lerp, randInt } from "three/src/math/MathUtils.js";
import { VISEMES } from "wawa-lipsync";
import { RecordingStatus } from "shared-contracts";

interface CharacterProps {
  status: RecordingStatus;
  useBrowserTts: boolean;
  lipsyncManager: any;
  [key: string]: any;
}

export const Character = ({ status, useBrowserTts, lipsyncManager, ...props }: CharacterProps) => {
  const { scene, animations } = useGLTF("models/Santa.glb");

  const { actions, mixer } = useAnimations(animations, scene);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
        child.frustumCulled = false;
        (child as any).material = new MeshPhysicalMaterial({
          ...(child as any).material,
          roughness: 1,
          ior: 2.2,
          iridescence: 0.7,
          iridescenceIOR: 1.3,
          reflectivity: 1,
        });
      }
    });
  }, [scene]);

  const [animation, setAnimation] = useState("Idle");

  useEffect(() => {
    const action = {
      SPEAKING: ["Talking", "Talking 2 ", "Talking 3"][randInt(0, 2)],
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
    scene.traverse((child) => {
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
          skinnedMesh.morphTargetInfluences[morphIndex] = lerp(
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
      }, randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  useFrame((state) => {
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
