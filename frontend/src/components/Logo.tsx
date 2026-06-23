import React from 'react';
import { Sparkles } from 'lucide-react';

interface LogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ showText = true, size = 'sm' }: LogoProps): React.ReactElement {
  const iconSizes = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const sparkSizes = {
    sm: 'w-4.5 h-4.5 text-blue-400',
    md: 'w-6 h-6 text-blue-400',
    lg: 'w-8 h-8 text-blue-400',
  };

  const titleSizes = {
    sm: 'text-sm font-bold tracking-wider',
    md: 'text-xl font-bold tracking-wider',
    lg: 'text-3xl font-black tracking-widest',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className="flex items-center gap-3 group select-none cursor-pointer">
      {/* Animated Logo Mark */}
      <div className="relative">
        {/* Ambient Blur Glow Behind */}
        <div className={`absolute inset-0 bg-gradient-to-tr from-blue-500 via-indigo-500 to-emerald-500 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-500 ${iconSizes[size]}`} />
        
        {/* Icon Frame */}
        <div className={`rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center relative overflow-hidden shadow-inner ${iconSizes[size]}`}>
          {/* Dashboard concentric spinning dashboard border lines */}
          <div className="absolute inset-0.5 rounded-lg border border-dashed border-blue-500/25 animate-spin-slow" />
          <div className="absolute inset-1.5 rounded-lg border border-dotted border-indigo-500/20 animate-spin-reverse-slow" />
          
          {/* Floating Sparkles Symbol */}
          <Sparkles className={`animate-float ${sparkSizes[size]}`} />
        </div>
      </div>

      {/* Brand Text Signature */}
      {showText && (
        <div className="flex flex-col text-left">
          <span className={`bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent ${titleSizes[size]}`}>
            AI ROLEPLAY
          </span>
          <span className={`text-slate-500 font-mono tracking-widest uppercase font-medium mt-0.5 hidden sm:inline-block ${subtitleSizes[size]}`}>
            Realtime Speaking
          </span>
        </div>
      )}
    </div>
  );
}
