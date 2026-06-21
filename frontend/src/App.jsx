import React from 'react';
import { useAudioRecorder } from './features/audio-core/hooks/useAudioRecorder';

function App() {
  const {
    isRecording,
    status,
    rmsVolume,
    startRecording,
    stopRecording,
  } = useAudioRecorder('http://localhost:5000');

  // Calculate volume percentage for simple UI visualizer
  const volumePercentage = Math.min(100, Math.round(rmsVolume * 500));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-2 tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Audio Pipeline Validation
        </h1>
        <p className="text-sm text-slate-400 text-center mb-8">
          Phase 1: Validate microphone downsampling (PCM16 16kHz) and WebSocket streaming.
        </p>

        {/* State Indicator */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
            status === 'LISTENING' ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse' :
            status === 'PROCESSING' ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' :
            'border-slate-800'
          }`}>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
              {status}
            </span>
          </div>
        </div>

        {/* Volume Visualizer */}
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

        {/* Control Buttons */}
        <div className="w-full flex gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex-1 py-3 px-6 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/10 focus:outline-none"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex-1 py-3 px-6 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-500/10 focus:outline-none"
            >
              Stop & Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
