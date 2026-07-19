import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { Experience } from './Experience';

interface TutorCanvasProps {
  status: RecordingStatus;
  useBrowserTts: boolean;
  lipsyncManager: any;
  onReady?: () => void;
  className?: string;
}

export function TutorCanvas({
  status,
  useBrowserTts,
  lipsyncManager,
  onReady,
  className,
}: TutorCanvasProps): React.ReactElement {
  return (
    <Canvas
      camera={{ position: [3, 3, 3], fov: 30 }}
      dpr={[1, 1.25]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      className={className}
    >
      <color attach="background" args={["#121315"]} />
      <Suspense fallback={null}>
        <Experience
          status={status}
          useBrowserTts={useBrowserTts}
          lipsyncManager={lipsyncManager}
          setAppLoaded={onReady}
        />
      </Suspense>
    </Canvas>
  );
}

export default TutorCanvas;
