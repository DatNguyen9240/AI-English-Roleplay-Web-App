import React from 'react';
import { HelpCircle } from 'lucide-react';

export function OnboardingGuide(): React.ReactElement {
  return (
    <div className="w-full bg-slate-900/25 border border-white/5 rounded-2xl p-4 sm:p-6 text-left flex flex-col justify-center h-full animate-fade-in shadow-inner">
      <div className="flex items-center gap-1.5 mb-4 border-b border-white/5 pb-2">
        <HelpCircle className="w-4 h-4 text-indigo-400" />
        <h3 className="text-xs font-bold text-slate-200 font-sans uppercase tracking-wider">
          How It Works (Hướng dẫn)
        </h3>
      </div>
      <ul className="text-xs text-slate-400 space-y-3 font-sans list-decimal pl-4 leading-relaxed">
        <li>Type what topic you want to practice on the left and click <strong className="text-indigo-300">Start Scenario</strong>.</li>
        <li>The AI will speak first and ask a question. Listen and read along.</li>
        <li>When the AI finishes, the mic turns on automatically. Speak your reply.</li>
        <li>Stop speaking for <strong className="text-indigo-300">1.5 seconds</strong> to send, or type/paste your reply below anytime.</li>
        <li><em className="text-cyan-400">Tip: Speak over the AI at any time to interrupt it!</em></li>
      </ul>
    </div>
  );
}
