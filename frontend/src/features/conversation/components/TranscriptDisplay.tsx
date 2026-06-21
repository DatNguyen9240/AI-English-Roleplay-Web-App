import React from 'react';
import { RecordingStatus } from 'shared-contracts';

interface TranscriptDisplayProps {
  status: RecordingStatus;
  transcript: string;
}

/**
 * Displays the STT transcript from the last completed voice turn.
 * PROCESSING → animated bouncing dots
 * has transcript → fade-in result card
 */
export function TranscriptDisplay({ status, transcript }: TranscriptDisplayProps): React.ReactElement | null {
  if (status === 'PROCESSING') {
    return (
      <div className="w-full flex flex-col items-center gap-3 py-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-xs text-amber-400/80 font-mono tracking-widest uppercase">
          Transcribing...
        </p>
      </div>
    );
  }

  if (!transcript) return null;

  return (
    <div className="w-full rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4 animate-[fadeIn_0.4s_ease-out]">
      <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
        You said
      </p>
      <p className="text-slate-100 text-sm leading-relaxed font-medium">
        &ldquo;{transcript}&rdquo;
      </p>
    </div>
  );
}
