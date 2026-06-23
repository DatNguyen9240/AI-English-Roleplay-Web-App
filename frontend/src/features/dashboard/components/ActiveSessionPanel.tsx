import React from 'react';
import { RecordingStatus } from 'shared-contracts';
import { Mic, Volume2, Loader2 } from 'lucide-react';
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

  return (
    <div className="w-full flex flex-col items-center justify-between h-full gap-3 sm:gap-5 animate-fade-in">
      
      {/* FSM State Circle Visualizer */}
      <div className="flex flex-col items-center justify-center mt-1 sm:mt-2">
        <div
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
            status === 'LISTENING'   ? 'border-status-listening shadow-glow-listening' :
            status === 'PROCESSING' ? 'border-status-processing shadow-glow-processing animate-pulse' :
            status === 'THINKING'   ? 'border-status-thinking shadow-glow-thinking animate-pulse' :
            status === 'SPEAKING'   ? 'border-status-speaking shadow-glow-speaking' :
            'border-panel-border'
          }`}
          style={{
            transform: status === 'LISTENING' ? `scale(${1 + Math.min(0.2, rmsVolume * 3.5)})` : 'scale(1)',
            transition: 'transform 100ms ease-out, border-color 300ms, box-shadow 300ms',
          }}
        >
          <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-slate-350">
            {status}
          </span>
        </div>
      </div>

      {/* Dynamic Turn Guidance Badge */}
      <div className="w-full flex justify-center">
        {status === 'LISTENING' && (
          <div className="text-[11px] sm:text-xs font-bold text-status-listening bg-status-listening/10 border border-status-listening/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 animate-pulse font-mono uppercase tracking-wider shadow-inner">
            <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-listening animate-bounce" />
            Your Turn: Speak now!
          </div>
        )}
        {status === 'SPEAKING' && (
          <div className="text-[11px] sm:text-xs font-bold text-status-speaking bg-status-speaking/10 border border-status-speaking/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider shadow-inner">
            <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-speaking animate-pulse" />
            AI is Speaking...
          </div>
        )}
        {status === 'THINKING' && (
          <div className="text-[11px] sm:text-xs font-bold text-status-thinking bg-status-thinking/10 border border-status-thinking/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider shadow-inner">
            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-thinking animate-spin" />
            AI is Thinking...
          </div>
        )}
        {status === 'PROCESSING' && (
          <div className="text-[11px] sm:text-xs font-bold text-status-processing bg-status-processing/10 border border-status-processing/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 font-mono uppercase tracking-wider shadow-inner">
            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-processing animate-spin" />
            Processing Voice...
          </div>
        )}
        {status === 'IDLE' && (
          <button
            onClick={startMicManual}
            className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white transition-all shadow-glow-listening focus:outline-none text-xs sm:text-sm animate-pulse flex items-center justify-center gap-2"
          >
            <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            Tap to Speak (Nhấn để nói)
          </button>
        )}
      </div>

      {/* Real-time Voice Spectrum Analyzer */}
      <div className="w-full px-2 flex flex-col gap-1 sm:gap-1.5">
        <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider uppercase">
          <span>Voice Activity</span>
          <span>{volumePercentage}%</span>
        </div>
        <VoiceVisualizer status={status} rmsVolume={rmsVolume} />
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-2 sm:gap-2.5">
        {status === 'LISTENING' && (
          <button
            id="btn-stop-recording"
            onClick={stopRecording}
            className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-bold bg-gradient-to-r from-brand-primary-start to-brand-primary-end hover:brightness-110 text-white transition-all shadow-glow-blue focus:outline-none text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            Done Speaking / Send (Xong & Gửi đi)
          </button>
        )}

        <button
          onClick={resetSession}
          className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-bold border border-panel-border hover:bg-panel-inner/80 text-slate-350 transition-colors focus:outline-none text-xs sm:text-sm"
        >
          Exit Session (Thoát Roleplay)
        </button>
      </div>
    </div>
  );
}
