import React from 'react';
import { RecordingStatus } from 'shared-contracts';
import { Mic, Volume2, Loader2, LogOut, Send } from 'lucide-react';
import { VoiceVisualizer } from './VoiceVisualizer';

interface ActiveSessionPanelProps {
  status: RecordingStatus;
  rmsVolume: number;
  stopRecording: () => void;
  startMicManual: () => void;
  resetSession: () => void;
}

export function ActiveSessionPanel({
  status,
  rmsVolume,
  stopRecording,
  startMicManual,
  resetSession,
}: ActiveSessionPanelProps): React.ReactElement {
  const volumePercentage = Math.min(100, Math.round(rmsVolume * 500));

  // Determine state styling classes
  const stateColorClasses = {
    LISTENING: 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] text-cyan-400',
    PROCESSING: 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] text-amber-400 animate-pulse',
    THINKING: 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)] text-pink-400 animate-pulse',
    SPEAKING: 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)] text-violet-400',
    IDLE: 'border-white/10 text-slate-400',
    ERROR: 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] text-rose-400'
  };

  const activeStateClass = stateColorClasses[status] || stateColorClasses.IDLE;

  return (
    <div className="w-full flex flex-col h-full justify-between animate-fade-in">
      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (sm:flex) */}
      {/* ========================================================================= */}
      <div className="hidden sm:flex flex-col items-center justify-between h-full gap-5">
        {/* State Circle */}
        <div className="flex flex-col items-center justify-center mt-2">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${activeStateClass}`}
            style={{
              transform: status === 'LISTENING' ? `scale(${1 + Math.min(0.12, rmsVolume * 2.5)})` : 'scale(1)',
              transition: 'transform 100ms ease-out, border-color 300ms, box-shadow 300ms',
            }}
          >
            <span className="text-[10px] font-mono font-black uppercase tracking-widest">
              {status}
            </span>
          </div>
        </div>

        {/* Guidance Badge */}
        <div className="w-full flex justify-center">
          {status === 'LISTENING' && (
            <div className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full flex items-center gap-2 animate-pulse font-mono uppercase tracking-wider">
              <Mic className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
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
            <div className="text-xs font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-4 py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider">
              <Loader2 className="w-3.5 h-3.5 text-pink-400 animate-spin" />
              AI is Thinking...
            </div>
          )}
          {status === 'PROCESSING' && (
            <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              Processing Voice...
            </div>
          )}
          {status === 'IDLE' && (
            <button
              onClick={startMicManual}
              className="w-full py-3 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-glow-listening flex items-center justify-center gap-2 text-sm animate-pulse"
            >
              <Mic className="w-4 h-4 text-white" />
              Tap to Speak (Nhấn để nói)
            </button>
          )}
        </div>

        {/* Waveform visualizer */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono tracking-wider uppercase">
            <span>Voice Activity</span>
            <span>{volumePercentage}%</span>
          </div>
          <VoiceVisualizer status={status} rmsVolume={rmsVolume} />
        </div>

        {/* Done / Exit Action buttons */}
        <div className="w-full flex flex-col gap-2.5 mt-auto">
          {status === 'LISTENING' && (
            <button
              onClick={stopRecording}
              className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-brand-primary-start to-brand-primary-end hover:brightness-110 text-white transition-all shadow-glow-blue flex items-center justify-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" />
              Done Speaking / Send
            </button>
          )}
          <button
            onClick={resetSession}
            className="w-full py-3 px-6 rounded-xl font-semibold border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white transition-all text-sm"
          >
            Exit Session (Thoát)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE LAYOUT (sm:hidden) */}
      {/* ========================================================================= */}
      <div className="flex sm:hidden flex-row items-center justify-between gap-3 w-full">
        
        {/* Small pulsing status indicator */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${activeStateClass}`}
            style={{
              transform: status === 'LISTENING' ? `scale(${1 + Math.min(0.1, rmsVolume * 1.5)})` : 'scale(1)',
            }}
          >
            {status === 'LISTENING' && <Mic className="w-4.5 h-4.5 text-cyan-400" />}
            {status === 'SPEAKING' && <Volume2 className="w-4.5 h-4.5 text-violet-400" />}
            {status === 'THINKING' && <Loader2 className="w-4.5 h-4.5 text-pink-400 animate-spin" />}
            {status === 'PROCESSING' && <Loader2 className="w-4.5 h-4.5 text-amber-400 animate-spin" />}
            {status === 'IDLE' && <Mic className="w-4.5 h-4.5 text-slate-500" />}
          </div>
        </div>

        {/* Middle Area: Waveform & Guidance text */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-bold font-sans tracking-wide truncate">
            {status === 'LISTENING' && <span className="text-cyan-400">Your turn • Speak now</span>}
            {status === 'SPEAKING' && <span className="text-violet-400 font-medium">AI is speaking...</span>}
            {status === 'THINKING' && <span className="text-pink-400 font-medium">Thinking...</span>}
            {status === 'PROCESSING' && <span className="text-amber-400 font-medium">Processing voice...</span>}
            {status === 'IDLE' && <span className="text-slate-400">Microphone off</span>}
          </span>
          <VoiceVisualizer status={status} rmsVolume={rmsVolume} />
        </div>

        {/* Right Area: Done/Exit buttons */}
        <div className="flex flex-row items-center gap-1.5 flex-shrink-0">
          {status === 'LISTENING' && (
            <button
              onClick={stopRecording}
              className="px-3 py-2 bg-gradient-to-r from-brand-primary-start to-brand-primary-end hover:brightness-110 text-white rounded-lg text-xs font-bold shadow-glow-blue flex items-center justify-center gap-1"
              title="Done speaking"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          )}
          {status === 'IDLE' && (
            <button
              onClick={startMicManual}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-glow-listening flex items-center justify-center gap-1"
              title="Speak"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Speak</span>
            </button>
          )}
          <button
            onClick={resetSession}
            className="p-2 border border-white/10 hover:bg-white/5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors flex items-center justify-center"
            title="Exit Session"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
