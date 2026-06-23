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
    <div className="w-full flex flex-col justify-center h-full gap-5 animate-fade-in">
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
          className="w-full px-4 py-3 rounded-xl bg-panel-inner border border-panel-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>
      <button
        id="btn-start-recording"
        onClick={() => startRecording(topic.trim() || undefined)}
        disabled={isDisabled}
        className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-brand-primary-start to-brand-primary-end hover:brightness-110 text-white transition-all shadow-glow-blue focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4 fill-white text-white" />
        {topic.trim() ? `Start Scenario` : startButtonLabel}
      </button>
    </div>
  );
}
