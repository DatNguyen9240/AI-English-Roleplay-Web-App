import React from 'react';
import { Play } from 'lucide-react';

interface TopicSelectorProps {
  topic: string;
  setTopic: (topic: string) => void;
  isDisabled: boolean;
  startRecording: (topic?: string) => void;
  startButtonLabel: string;
}

export function TopicSelector({
  topic,
  setTopic,
  isDisabled,
  startRecording,
  startButtonLabel,
}: TopicSelectorProps): React.ReactElement {
  return (
    <div className="w-full flex flex-col justify-center h-full gap-4 sm:gap-5 animate-fade-in text-left">
      <div className="w-full flex flex-col gap-1.5 sm:gap-2">
        <label className="text-[10px] sm:text-xs font-bold text-slate-400 font-sans uppercase tracking-wider">
          Practice Topic (Chủ đề luyện tập)
        </label>
        <input
          type="text"
          placeholder="E.g., Job Interview, Daily Life, Travel..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isDisabled}
          className="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/5 focus:border-indigo-500/50 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300 shadow-inner"
        />
      </div>
      <button
        id="btn-start-recording"
        onClick={() => startRecording(topic.trim() || undefined)}
        disabled={isDisabled}
        className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-brand-primary-start to-brand-primary-end hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 text-white transition-all duration-300 shadow-glow-blue focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
      >
        <Play className="w-4.5 h-4.5 fill-current text-white animate-pulse" />
        <span>{topic.trim() ? `Start Scenario` : startButtonLabel}</span>
      </button>
    </div>
  );
}
