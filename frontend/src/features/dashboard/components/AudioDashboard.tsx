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
 * Updated: Supports text drafting/pasting and custom topic roleplay generation.
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

  const startButtonLabel =
    status === 'ERROR'      ? 'Retry' :
    status === 'PROCESSING' ? 'Transcribing…' :
    status === 'THINKING'   ? 'AI is responding…' :
    status === 'SPEAKING'   ? 'AI is speaking…' :
    'Start General Conversation';

  return (
    <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">

      <h1 className="text-2xl font-bold text-center mb-2 tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        AI English Roleplay
      </h1>
      <p className="text-sm text-slate-400 text-center mb-8">
        Practice spoken English with an interactive AI tutor.
      </p>

      {/* FSM State Circle Visualizer */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
          status === 'LISTENING'   ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse' :
          status === 'PROCESSING' ? 'border-amber-500  shadow-[0_0_20px_rgba(245,158,11,0.3)]  animate-pulse' :
          status === 'THINKING'   ? 'border-teal-400   shadow-[0_0_20px_rgba(45,212,191,0.3)]  animate-pulse' :
          status === 'SPEAKING'   ? 'border-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.5)] animate-pulse' :
          status === 'ERROR'      ? 'border-rose-500   shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
          'border-slate-800'
        }`}>
          <span className={`text-xs font-mono font-bold uppercase tracking-widest ${
            status === 'ERROR' ? 'text-rose-400' : 'text-slate-300'
          }`}>
            {status}
          </span>
        </div>
      </div>

      {/* Dynamic Turn Guidance Badge */}
      {isRecording && (
        <div className="w-full flex justify-center mb-6">
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
          {status === 'ERROR' && (
            <div className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              An error occurred
            </div>
          )}
        </div>
      )}

      {/* Volume Visualizer — visible only during active recording */}
      {isRecording && (
        <div className="w-full mb-8">
          <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>Input Mic Level</span>
            <span>{volumePercentage}%</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-75"
              style={{ width: `${volumePercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* User Transcript (STT) */}
      <div className="w-full mb-4">
        <TranscriptDisplay status={status} transcript={transcript} />
      </div>

      {/* AI Response (LLM streaming) */}
      <div className="w-full mb-6">
        <SubtitleDisplay
          status={status}
          llmText={llmText}
          currentPlayingSentence={currentPlayingSentence}
          highlightedWordIndex={highlightedWordIndex}
        />
      </div>

      {/* Control Buttons & Inputs */}
      <div className="w-full flex flex-col gap-4">
        {!isRecording ? (
          <>
            <div className="w-full flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 text-left font-mono">
                Custom Topic (e.g. Job Interview, Environment, Shopping)
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
              className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-colors shadow-lg shadow-blue-500/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              {topic.trim() ? `Start Scenario: ${topic.trim()}` : startButtonLabel}
            </button>

            {/* Quick Guide Onboard */}
            <div className="w-full border-t border-slate-800 pt-6 mt-4 text-left">
              <div className="flex items-center gap-1.5 mb-3">
                <HelpCircle className="w-4 h-4 text-slate-300" />
                <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                  How It Works
                </h3>
              </div>
              <ul className="text-xs text-slate-400 space-y-2 font-sans list-decimal pl-4">
                <li>Type what topic you want to practice and click <strong>Start</strong>.</li>
                <li>The AI will speak first and ask a question. Listen and read along.</li>
                <li>When the AI finishes, the mic turns on automatically. Speak your reply.</li>
                <li>Stop speaking for <strong>1.5 seconds</strong> to send, or type/paste below anytime.</li>
                <li><em>Tip: Speak over the AI at any time to interrupt it!</em></li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* Drafting area for typed response */}
            <div className="w-full border-t border-slate-800 pt-4 mb-2">
              <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
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
                className="w-full flex flex-col gap-2"
              >
                <textarea
                  name="textInput"
                  placeholder="Type or paste your English reply here..."
                  disabled={status === 'PROCESSING' || status === 'THINKING'}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={status === 'PROCESSING' || status === 'THINKING'}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white text-sm font-bold transition-all shadow-md focus:outline-none"
                >
                  Send Reply
                </button>
              </form>
            </div>

            <button
              id="btn-stop-recording"
              onClick={stopRecording}
              className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white transition-colors shadow-lg shadow-rose-500/10 focus:outline-none"
            >
              End Roleplay Session
            </button>
          </>
        )}
      </div>

      {status === 'ERROR' && (
        <p className="text-xs text-rose-400 mt-4 text-center">
          An error occurred. Make sure the backend is running and you have microphone access.
        </p>
      )}
    </div>
  );
}
