import { Gltf } from "@react-three/drei";
import { useEffect } from "react";
import { degToRad } from "three/src/math/MathUtils.js";
import { CameraManager } from "./CameraManager";
import { Character } from "./Character";
import { RecordingStatus } from "shared-contracts";

interface ExperienceProps {
  status: RecordingStatus;
  useBrowserTts: boolean;
  lipsyncManager: any;
  setAppLoaded?: () => void;
}

export const Experience = ({ status, useBrowserTts, lipsyncManager, setAppLoaded }: ExperienceProps) => {
  useEffect(() => {
    if (setAppLoaded) {
      setAppLoaded();
    }
  }, [setAppLoaded]);

  return (
    <>
      <CameraManager status={status} />
      <Character
        status={status}
        useBrowserTts={useBrowserTts}
        lipsyncManager={lipsyncManager}
        rotation-y={degToRad(10)}
        scale={0.6}
      />

      <directionalLight
        position={[-3, 3, 10]}
        intensity={2.5}
        color={"white"}
      />
      <directionalLight
        position={[3, 3, 10]}
        intensity={1.2}
        color={"mediumpurple"}
      />
      <directionalLight position={[0, 0, -10]} intensity={9} color={"orange"} />
      
      {/* Christmas Scene GLTF */}
      {/*
      <Gltf
        rotation-y={degToRad(-20)}
        position-y={7.72}
        src="models/lowp_-_christmas_-_cc0_asset_pack-opt.glb"
      />
      */}

    </>
  );
};
