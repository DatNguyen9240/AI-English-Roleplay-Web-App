import React from 'react';
import { RecordingStatus } from 'shared-contracts';
import { Play, Mic, Volume2, Loader2 } from 'lucide-react';
import { VoiceVisualizer } from './VoiceVisualizer';
import { VoiceSettingsCard } from './VoiceSettingsCard';

interface ScenarioSelectorProps {
  isSessionActive: boolean;
  topic: string;
  setTopic: (val: string) => void;
  isDisabled: boolean;
  startRecording: (topic?: string) => void;
  startButtonLabel: string;
  status: RecordingStatus;
  rmsVolume: number;
  volumePercentage: number;
  startMicManual: () => void;
  stopRecording: () => void;
  resetSession: () => void;
  useBrowserTts: boolean;
  availableVoices: SpeechSynthesisVoice[];
  ttsVoiceName: string | null;
  changeTtsVoiceName: (val: string | null) => void;
  ttsRate: number;
  changeTtsRate: (val: number) => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  isSessionActive,
  topic,
  setTopic,
  isDisabled,
  startRecording,
  startButtonLabel,
  status,
  rmsVolume,
  volumePercentage,
  startMicManual,
  stopRecording,
  resetSession,
  useBrowserTts,
  availableVoices,
  ttsVoiceName,
  changeTtsVoiceName,
  ttsRate,
  changeTtsRate,
}) => {
  return (
    <div className="w-full sm:w-4/12 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[340px] shadow-inner">
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

          {/* Voice Settings Card (Free Browser Voice settings) */}
          <VoiceSettingsCard
            useBrowserTts={useBrowserTts}
            availableVoices={availableVoices}
            ttsVoiceName={ttsVoiceName}
            changeTtsVoiceName={changeTtsVoiceName}
            ttsRate={ttsRate}
            changeTtsRate={changeTtsRate}
          />
        </div>
      ) : (
        /* Active Left: Circle Visualizer, Guidance Badge, Volume & Exit Button */
        <div className="w-full flex flex-col items-center justify-between h-full gap-5">
          {/* FSM State Circle Visualizer */}
          <div className="flex flex-col items-center justify-center mt-2">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                status === 'LISTENING'   ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]' :
                status === 'PROCESSING' ? 'border-amber-500  shadow-[0_0_15px_rgba(245,158,11,0.3)]  animate-pulse' :
                status === 'THINKING'   ? 'border-teal-400   shadow-[0_0_15px_rgba(45,212,191,0.3)]  animate-pulse' :
                status === 'SPEAKING'   ? 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]' :
                'border-slate-800'
              }`}
              style={{
                transform: status === 'LISTENING' ? `scale(${1 + Math.min(0.2, rmsVolume * 3.5)})` : 'scale(1)',
                transition: 'transform 100ms ease-out, border-color 300ms, box-shadow 300ms',
              }}
            >
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-300">
                {status}
              </span>
            </div>
          </div>

          {/* Dynamic Turn Guidance Badge */}
          <div className="w-full flex justify-center">
            {status === 'LISTENING' && (
              <div className="w-full text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center justify-center gap-2 animate-pulse font-mono uppercase tracking-wider">
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                Your Turn: Speak now!
              </div>
            )}
            {status === 'SPEAKING' && (
              <div className="w-full text-center text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-full flex items-center justify-center gap-2 font-mono uppercase tracking-wider">
                <Volume2 className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                AI is Speaking...
              </div>
            )}
            {status === 'THINKING' && (
              <div className="w-full text-center text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-full flex items-center justify-center gap-2 font-mono uppercase tracking-wider">
                <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                AI is Thinking...
              </div>
            )}
            {status === 'PROCESSING' && (
              <div className="w-full text-center text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full flex items-center justify-center gap-2 font-mono uppercase tracking-wider">
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                Processing Voice...
              </div>
            )}
            {status === 'IDLE' && (
              <button
                onClick={startMicManual}
                className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-lg shadow-emerald-500/10 focus:outline-none text-sm animate-pulse flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4 text-white" />
                Tap to Speak (Nhấn để nói)
              </button>
            )}
          </div>

          {/* Real-time Voice Spectrum Analyzer */}
          <div className="w-full px-2 flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              <span>Voice Activity</span>
              <span>{volumePercentage}%</span>
            </div>
            <VoiceVisualizer status={status} rmsVolume={rmsVolume} />
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            {status === 'LISTENING' && (
              <button
                id="btn-stop-recording"
                onClick={stopRecording}
                className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-blue-500/10 focus:outline-none text-sm flex items-center justify-center gap-2"
              >
                Done Speaking / Send (Xong & Gửi đi)
              </button>
            )}

            <button
              onClick={resetSession}
              className="w-full py-3 px-6 rounded-xl font-bold border border-slate-700 hover:bg-slate-800 text-slate-350 transition-colors focus:outline-none text-sm"
            >
              Exit Session (Thoát Roleplay)
            </button>
          </div>

          {/* Voice Settings Card (Free Browser Voice settings) */}
          <VoiceSettingsCard
            useBrowserTts={useBrowserTts}
            availableVoices={availableVoices}
            ttsVoiceName={ttsVoiceName}
            changeTtsVoiceName={changeTtsVoiceName}
            ttsRate={ttsRate}
            changeTtsRate={changeTtsRate}
          />
        </div>
      )}
    </div>
  );
};
