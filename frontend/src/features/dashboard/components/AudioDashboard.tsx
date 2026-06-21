import React, { useState } from 'react';
import { TranscriptDisplay } from '@/features/conversation/components/TranscriptDisplay';
import { SubtitleDisplay } from '@/features/conversation/components/SubtitleDisplay';
import { RecordingStatus } from 'shared-contracts';
import { Mic, Volume2, Loader2, AlertCircle, Play, HelpCircle } from 'lucide-react';

interface AudioDashboardProps {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  llmText: string;
  currentPlayingSentence?: string;
  highlightedWordIndex?: number;
  startRecording: (topic?: string) => void;
  stopRecording: () => void;
  sendTextMessage: (text: string) => void;
}

/**
 * Primary audio recording console.
 * Phase 4: Now displays both user transcript (STT) and streaming AI response (LLM).
 * Updated: Redesigned into a premium, responsive side-by-side layout (horizontal split) on desktop.
 */
export function AudioDashboard({
  isRecording,
  status,
  rmsVolume,
  transcript,
  llmText,
  currentPlayingSentence,
  highlightedWordIndex,
  startRecording,
  stopRecording,
  sendTextMessage,
}: AudioDashboardProps): React.ReactElement {
  const [topic, setTopic] = useState('');
  const volumePercentage = Math.min(100, Math.round(rmsVolume * 500));

  const isDisabled = status === 'PROCESSING' || status === 'THINKING' || status === 'SPEAKING';
  const isSessionActive = status !== 'IDLE' && status !== 'ERROR';

  const startButtonLabel =
    status === 'ERROR'      ? 'Retry' :
    status === 'PROCESSING' ? 'Transcribing…' :
    status === 'THINKING'   ? 'AI is responding…' :
    status === 'SPEAKING'   ? 'AI is speaking…' :
    'Start General Conversation';

  return (
    <div className="max-w-4xl w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col transition-all duration-300">
      
      {/* App Title Header */}
      <div className="w-full border-b border-slate-800/80 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent text-center sm:text-left">
            AI English Roleplay
          </h1>
          <p className="text-xs text-slate-400 text-center sm:text-left mt-0.5">
            Practice spoken English with an interactive AI tutor.
          </p>
        </div>
        {isSessionActive && (
          <div className="text-xs px-3 py-1 bg-slate-800 border border-slate-700 text-slate-350 font-mono rounded-full uppercase tracking-wider">
            Active Session
          </div>
        )}
      </div>

      {/* Main Grid: Left and Right Columns */}
      <div className="w-full flex flex-col sm:flex-row gap-6 items-stretch">
        
        {/* Left Column (State, Volume Visualizer & Connection Controls) */}
        <div className="w-full sm:w-5/12 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 flex flex-col items-center justify-between min-h-[280px] shadow-inner">
          {!isSessionActive ? (
            /* Idle Left: Topic Input & Start */
            <div className="w-full flex flex-col justify-center h-full gap-5">
              <div className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 text-left font-mono">
                  Custom Topic (e.g. Job Interview, Environment)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank for general chat..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isDisabled}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                id="btn-start-recording"
                onClick={() => startRecording(topic.trim() || undefined)}
                disabled={isDisabled}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-colors shadow-lg shadow-blue-500/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white text-white" />
                {topic.trim() ? `Start Scenario` : startButtonLabel}
              </button>
            </div>
          ) : (
            /* Active Left: Circle Visualizer, Guidance Badge, Volume & Exit Button */
            <div className="w-full flex flex-col items-center justify-between h-full gap-4">
              
              {/* FSM State Circle Visualizer */}
              <div className="flex flex-col items-center justify-center mt-2">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                  status === 'LISTENING'   ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse' :
                  status === 'PROCESSING' ? 'border-amber-500  shadow-[0_0_15px_rgba(245,158,11,0.3)]  animate-pulse' :
                  status === 'THINKING'   ? 'border-teal-400   shadow-[0_0_15px_rgba(45,212,191,0.3)]  animate-pulse' :
                  status === 'SPEAKING'   ? 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-pulse' :
                  'border-slate-800'
                }`}>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-300">
                    {status}
                  </span>
                </div>
              </div>

              {/* Dynamic Turn Guidance Badge */}
              <div className="w-full flex justify-center">
                {status === 'LISTENING' && (
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-2 animate-pulse font-mono uppercase tracking-wider">
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                    Your Turn: Speak now!
                  </div>
                )}
                {status === 'SPEAKING' && (
                  <div className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Volume2 className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                    AI is Speaking...
                  </div>
                )}
                {status === 'THINKING' && (
                  <div className="text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                    AI is Thinking...
                  </div>
                )}
                {status === 'PROCESSING' && (
                  <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    Processing Voice...
                  </div>
                )}
              </div>

              {/* Volume Visualizer */}
              <div className="w-full px-2">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                  <span>Input Mic Level</span>
                  <span>{volumePercentage}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-75"
                    style={{ width: `${volumePercentage}%` }}
                  />
                </div>
              </div>

              {/* End Session Button */}
              <button
                id="btn-stop-recording"
                onClick={stopRecording}
                className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white transition-colors shadow-lg shadow-rose-500/10 focus:outline-none text-sm"
              >
                End Roleplay Session
              </button>
            </div>
          )}
        </div>

        {/* Right Column (Dialogue Display, Subtitles, Text Drafting & User Guide) */}
        <div className="w-full sm:w-7/12 flex flex-col justify-between min-h-[280px]">
          {!isSessionActive ? (
            /* Idle Right: Quick Guide Onboard */
            <div className="w-full bg-slate-950/20 border border-slate-800/40 rounded-2xl p-4 text-left flex flex-col justify-center h-full">
              <div className="flex items-center gap-1.5 mb-4">
                <HelpCircle className="w-4 h-4 text-slate-455" />
                <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
                  How It Works
                </h3>
              </div>
              <ul className="text-xs text-slate-400 space-y-3 font-sans list-decimal pl-4 leading-relaxed">
                <li>Type what topic you want to practice on the left and click <strong>Start Scenario</strong>.</li>
                <li>The AI will speak first and ask a question. Listen and read along.</li>
                <li>When the AI finishes, the mic turns on automatically. Speak your reply.</li>
                <li>Stop speaking for <strong>1.5 seconds</strong> to send, or type/paste your reply below anytime.</li>
                <li><em>Tip: Speak over the AI at any time to interrupt it!</em></li>
              </ul>
            </div>
          ) : (
            /* Active Right: Transcripts, Subtitles & Text Input */
            <div className="w-full sm:w-7/12 flex flex-col gap-4 justify-between h-full">
              
              {/* Message Box Areas */}
              <div className="flex flex-col gap-3 flex-1 justify-start">
                {/* User Transcript (STT) */}
                <div className="w-full max-h-[100px] overflow-y-auto">
                  <TranscriptDisplay status={status} transcript={transcript} />
                </div>

                {/* AI Response (LLM streaming) */}
                <div className="w-full max-h-[150px] overflow-y-auto">
                  <SubtitleDisplay
                    status={status}
                    llmText={llmText}
                    currentPlayingSentence={currentPlayingSentence}
                    highlightedWordIndex={highlightedWordIndex}
                  />
                </div>
              </div>

              {/* Drafting area for typed response */}
              <div className="w-full border-t border-slate-850 pt-4 mt-auto">
                <div className="flex justify-between text-[11px] text-slate-400 mb-2 font-mono">
                  <span>Type or Paste Response</span>
                  <span className="text-blue-400 font-sans">Or speak freely via Mic</span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const textarea = form.elements.namedItem('textInput') as HTMLTextAreaElement;
                    if (textarea && textarea.value.trim()) {
                      sendTextMessage(textarea.value);
                      textarea.value = '';
                    }
                  }}
                  className="w-full flex gap-3 items-end"
                >
                  <textarea
                    name="textInput"
                    placeholder="Type or paste your English reply here..."
                    disabled={status === 'PROCESSING' || status === 'THINKING'}
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/85 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                  <button
                    type="submit"
                    disabled={status === 'PROCESSING' || status === 'THINKING'}
                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white text-sm font-bold transition-all shadow-md focus:outline-none h-[44px] flex items-center justify-center"
                  >
                    Send
                  </button>
                </form>
              </div>

            </div>
          )}
        </div>

      </div>

      {status === 'ERROR' && (
        <p className="text-xs text-rose-400 mt-4 text-center">
          An error occurred. Make sure the backend is running and you have microphone access.
        </p>
      )}
    </div>
  );
}
