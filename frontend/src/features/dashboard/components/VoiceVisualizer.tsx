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
    let height = 6; // Resting height in px

    if (status === 'LISTENING') {
      // Scale with the user's live voice volume, adding curved shape based on position
      const volumeFactor = Math.min(1, rmsVolume * 6);
      const positionFactor = Math.sin((i / 14) * Math.PI); // center bars are higher
      const randomMultiplier = 0.4 + 0.6 * Math.random();
      height = 6 + volumeFactor * 28 * positionFactor * randomMultiplier;
    } else if (status === 'SPEAKING') {
      // Beautiful wavy sine motion corresponding to AI speech
      const waveVal = Math.sin((i / 2) + phase * 0.4) * 0.5 + 0.5;
      const breathingEnvelope = 0.5 + 0.5 * Math.sin(phase * 0.1);
      height = 6 + waveVal * breathingEnvelope * 22;
    } else if (status === 'THINKING') {
      // Slow sweep from left to right
      const waveVal = Math.sin((i / 1.8) - phase * 0.25) * 0.5 + 0.5;
      height = 6 + waveVal * 14;
    } else if (status === 'PROCESSING') {
      // Pulse in unison
      const pulseVal = Math.sin(phase * 0.4) * 0.5 + 0.5;
      height = 6 + pulseVal * 10;
    } else if (status === 'IDLE') {
      // Gentle breathing scale
      const breathing = Math.sin(phase * 0.08) * 0.5 + 0.5;
      height = 4 + breathing * 3;
    }

    // Color definitions based on state
    const barColors = {
      LISTENING: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]',
      SPEAKING: 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]',
      THINKING: 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]',
      PROCESSING: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      IDLE: 'bg-slate-700',
      ERROR: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
    };

    const activeColor = barColors[status] || barColors.IDLE;

    return (
      <div
        key={i}
        className={`w-1 rounded-full transition-all duration-75 ease-out ${activeColor}`}
        style={{
          height: `${height}px`,
        }}
      />
    );
  });

  return (
    <div className="w-full flex flex-col items-center">
      <div className="h-8 sm:h-12 flex items-center justify-center gap-1 w-full bg-slate-950/40 border border-white/5 rounded-xl sm:rounded-2xl px-3 shadow-inner">
        {bars}
      </div>
    </div>
  );
}
