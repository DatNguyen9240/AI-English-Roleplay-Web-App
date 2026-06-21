import React, { useState, useEffect } from 'react';
import { RecordingStatus } from 'shared-contracts';

interface VoiceVisualizerProps {
  status: RecordingStatus;
  rmsVolume: number;
}

export function VoiceVisualizer({ status, rmsVolume }: VoiceVisualizerProps): React.ReactElement {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (status === 'THINKING' || status === 'SPEAKING' || status === 'PROCESSING') {
      const interval = setInterval(() => {
        setPhase((p) => (p + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Render 15 spectrum bars
  const bars = Array.from({ length: 15 }, (_, i) => {
    let height = 8; // Resting height in px

    if (status === 'LISTENING') {
      // Scale with the user's live voice volume, adding curved shape based on position
      const volumeFactor = Math.min(1, rmsVolume * 6);
      const positionFactor = Math.sin((i / 14) * Math.PI); // center bars are higher
      const randomMultiplier = 0.5 + 0.5 * Math.random();
      height = 8 + volumeFactor * 52 * positionFactor * randomMultiplier;
    } else if (status === 'SPEAKING') {
      // Beautiful wavy sine motion corresponding to AI speech
      const waveVal = Math.sin((i / 2.5) + phase * 0.45) * 0.5 + 0.5;
      const breathingEnvelope = 0.4 + 0.6 * Math.sin(phase * 0.12);
      height = 8 + waveVal * breathingEnvelope * 36;
    } else if (status === 'THINKING') {
      // Slow sweep from left to right
      const waveVal = Math.sin((i / 2) - phase * 0.3) * 0.5 + 0.5;
      height = 8 + waveVal * 20;
    } else if (status === 'PROCESSING') {
      // Pulse in unison
      const pulseVal = Math.sin(phase * 0.5) * 0.5 + 0.5;
      height = 8 + pulseVal * 12;
    } else if (status === 'IDLE') {
      // Gentle breathing scale
      const breathing = Math.sin(phase * 0.1) * 0.5 + 0.5;
      height = 6 + breathing * 4;
    }

    return (
      <div
        key={i}
        className="w-1 rounded-full transition-all duration-75 ease-out"
        style={{
          height: `${height}px`,
          backgroundColor:
            status === 'LISTENING' ? '#10b981' : // emerald-500
            status === 'SPEAKING' ? '#8b5cf6' :  // violet-500
            status === 'THINKING' ? '#2dd4bf' :  // teal-400
            status === 'PROCESSING' ? '#f59e0b' : // amber-500
            '#475569', // slate-600 (idle/resting)
          boxShadow:
            status === 'LISTENING' ? '0 0 12px rgba(16, 185, 129, 0.4)' :
            status === 'SPEAKING' ? '0 0 12px rgba(139, 92, 246, 0.4)' :
            status === 'THINKING' ? '0 0 8px rgba(45, 212, 191, 0.3)' :
            'none',
        }}
      />
    );
  });

  return (
    <div className="w-full flex flex-col gap-2 items-center">
      <div className="h-16 flex items-center justify-center gap-1.5 w-full bg-slate-950/30 border border-slate-800/40 rounded-2xl px-4 shadow-inner">
        {bars}
      </div>
    </div>
  );
}
