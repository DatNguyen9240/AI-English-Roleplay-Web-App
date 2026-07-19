import { useCallback, useRef } from "react";
import { MathUtils } from "three";
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
  const hasReportedReady = useRef(false);
  const reportReady = useCallback(() => {
    if (!hasReportedReady.current) {
      hasReportedReady.current = true;
      setAppLoaded?.();
    }
  }, [setAppLoaded]);

  return (
    <>
      <CameraManager status={status} />
      <Character
        status={status}
        useBrowserTts={useBrowserTts}
        lipsyncManager={lipsyncManager}
        onReady={reportReady}
        rotation-y={MathUtils.degToRad(10)}
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
        rotation-y={MathUtils.degToRad(-20)}
        position-y={7.72}
        src="models/lowp_-_christmas_-_cc0_asset_pack-opt.glb"
      />
      */}

    </>
  );
};
