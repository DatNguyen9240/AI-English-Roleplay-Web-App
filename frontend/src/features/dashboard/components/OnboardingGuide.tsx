import React from 'react';
import { HelpCircle } from 'lucide-react';

export function OnboardingGuide(): React.ReactElement {
  return (
    <div className="w-full bg-panel-inner/50 border border-panel-border/50 rounded-2xl p-4 sm:p-6 text-left flex flex-col justify-center h-full animate-fade-in shadow-inner">
      <div className="flex items-center gap-1.5 mb-4">
        <HelpCircle className="w-4.5 h-4.5 text-slate-400" />
        <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
          How It Works
        </h3>
      </div>
      <ul className="text-xs text-slate-455 space-y-3 font-sans list-decimal pl-4 leading-relaxed">
        <li>Type what topic you want to practice on the left and click <strong>Start Scenario</strong>.</li>
        <li>The AI will speak first and ask a question. Listen and read along.</li>
        <li>When the AI finishes, the mic turns on automatically. Speak your reply.</li>
        <li>Stop speaking for <strong>1.5 seconds</strong> to send, or type/paste your reply below anytime.</li>
        <li><em>Tip: Speak over the AI at any time to interrupt it!</em></li>
      </ul>
    </div>
  );
}
