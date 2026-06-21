import React from 'react';

/**
 * Renders the primary audio recording console and validation status.
 * @param {object} props
 * @param {boolean} props.isRecording 
 * @param {string} props.status 
 * @param {number} props.rmsVolume 
 * @param {() => void} props.startRecording 
 * @param {() => void} props.stopRecording 
 */
export function AudioDashboard({
  isRecording,
  status,
  rmsVolume,
  startRecording,
  stopRecording,
}) {
  // Calculate volume percentage for simple UI visualizer
  const volumePercentage = Math.min(100, Math.round(rmsVolume * 500));

  return (
    <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
      
      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-2 tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        Audio Pipeline Validation
      </h1>
      <p className="text-sm text-slate-400 text-center mb-8">
        Phase 2: Validate socket auth handshake, microphone streaming, and PCM16 wav creation.
      </p>

      {/* State Indicator */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
          status === 'LISTENING' ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse' :
          status === 'PROCESSING' ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' :
          status === 'ERROR' ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
          'border-slate-800'
        }`}>
          <span className={`text-xs font-mono font-bold uppercase tracking-widest ${
            status === 'ERROR' ? 'text-rose-400' : 'text-slate-300'
          }`}>
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
            className="flex-1 py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-colors shadow-lg shadow-blue-500/10 focus:outline-none"
          >
            {status === 'ERROR' ? 'Retry Connection' : 'Start Recording'}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white transition-colors shadow-lg shadow-rose-500/10 focus:outline-none"
          >
            Stop & Send
          </button>
        )}
      </div>
      
      {status === 'ERROR' && (
        <p className="text-xs text-rose-400 mt-4 text-center">
          Connection error occurred. Please make sure backend is running and database is active.
        </p>
      )}
    </div>
  );
}
