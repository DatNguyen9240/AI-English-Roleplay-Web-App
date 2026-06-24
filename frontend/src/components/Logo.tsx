import React from 'react';
import { Sparkles } from 'lucide-react';
import { ShinyText } from './react-bits/ShinyText';

interface LogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ showText = true, size = 'sm' }: LogoProps): React.ReactElement {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const sparkSizes = {
    sm: 'w-4 h-4 text-white',
    md: 'w-5 h-5 text-white',
    lg: 'w-6 h-6 text-white',
  };

  const titleSizes = {
    sm: 'text-xs font-bold tracking-wider',
    md: 'text-base font-bold tracking-wider',
    lg: 'text-xl font-bold tracking-wider',
  };

  const subtitleSizes = {
    sm: 'text-[8px]',
    md: 'text-[9px]',
    lg: 'text-[10px]',
  };

  return (
    <div className="flex items-center gap-2 select-none cursor-pointer">
      <div className={`rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center relative shadow-sm ${iconSizes[size]}`}>
        <Sparkles className={sparkSizes[size]} />
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <ShinyText
            text="AI Roleplay"
            className={`font-mono uppercase tracking-wider font-bold ${titleSizes[size]}`}
            speed={4.5}
          />
          <span className={`text-neutral-500 font-mono tracking-wider uppercase mt-0.5 hidden sm:inline-block ${subtitleSizes[size]}`}>
            Realtime Practice
          </span>
        </div>
      )}
    </div>
  );
}
export default Logo;
