import React from 'react';

interface DashboardHeaderProps {
  isSessionActive: boolean;
}

export function DashboardHeader({ isSessionActive }: DashboardHeaderProps): React.ReactElement {
  return (
    <div className="w-full border-b border-panel-border/80 pb-3 sm:pb-4 mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-center gap-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent text-center sm:text-left font-sans">
          AI English Roleplay
        </h1>
        <p className="text-xs text-slate-400 text-center sm:text-left mt-0.5 font-sans">
          Practice spoken English with an interactive AI tutor.
        </p>
      </div>
      {isSessionActive && (
        <div className="text-xs px-3 py-1 bg-panel-inner border border-panel-border text-slate-300 font-mono rounded-full uppercase tracking-wider animate-fade-in shadow-inner">
          Active Session
        </div>
      )}
    </div>
  );
}
