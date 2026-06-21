import React, { useRef, useEffect } from 'react';
import type { RecordingStatus } from '@/types/audio';

interface SubtitleDisplayProps {
  llmText: string;
  status: RecordingStatus;
  currentPlayingSentence?: string;
  highlightedWordIndex?: number;
}

/**
 * Displays the AI's streamed response text in real-time.
 * - THINKING: shows tokens as they stream in with a blinking cursor
 * - SPEAKING: shows the current sentence with highlighted spoken word (karaoke style)
 * - IDLE (with text): shows completed response, fades in
 * - Other states: shows nothing
 */
export function SubtitleDisplay({
  llmText,
  status,
  currentPlayingSentence,
  highlightedWordIndex,
}: SubtitleDisplayProps): React.ReactElement | null {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as new tokens arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [llmText, currentPlayingSentence]);

  const isThinking = status === 'THINKING';
  const isSpeaking = status === 'SPEAKING';
  const hasContent = (isSpeaking && currentPlayingSentence) || llmText.trim().length > 0;

  if (!isThinking && !hasContent && !isSpeaking) return null;

  return (
    <div
      className="w-full max-w-md animate-fade-in"
      role="region"
      aria-label="AI response"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V6h2v3z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
          AI Partner
        </span>
        {isThinking && (
          <span className="flex gap-0.5 items-center ml-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        )}
        {isSpeaking && (
          <span className="flex items-center ml-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-emerald-400 font-mono ml-1.5 uppercase tracking-wider font-bold">Speaking</span>
          </span>
        )}
      </div>

      {/* Text area */}
      <div
        ref={scrollRef}
        className="bg-slate-900/60 border border-emerald-500/20 rounded-xl px-4 py-3 max-h-36 overflow-y-auto shadow-inner"
      >
        {isSpeaking && currentPlayingSentence ? (
          <p className="text-slate-200 text-sm leading-relaxed font-light whitespace-pre-wrap flex flex-wrap gap-x-1.5 gap-y-1">
            {currentPlayingSentence.split(/\s+/).map((word, idx) => {
              const isHighlighted = idx === highlightedWordIndex;
              return (
                <span
                  key={idx}
                  className={`inline-block transition-all duration-150 rounded ${
                    isHighlighted
                      ? 'text-emerald-300 font-semibold bg-emerald-500/20 px-1 scale-105 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-400'
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </p>
        ) : (
          <p className="text-slate-200 text-sm leading-relaxed font-light whitespace-pre-wrap">
            {llmText}
            {isThinking && (
              <span className="inline-block w-0.5 h-3.5 bg-emerald-400 ml-0.5 align-middle animate-pulse" />
            )}
          </p>
        )}
      </div>
    </div>
  );
}
