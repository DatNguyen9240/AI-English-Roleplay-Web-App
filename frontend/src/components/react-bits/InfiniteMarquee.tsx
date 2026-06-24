import React from 'react';
import { motion } from 'framer-motion';

interface InfiniteMarqueeProps {
  items: string[];
  direction?: 'left' | 'right';
  speed?: number;
}

export function InfiniteMarquee({
  items,
  direction = 'left',
  speed = 25,
}: InfiniteMarqueeProps): React.ReactElement {
  // Duplicate the array several times to ensure it overflows the screen width and loops seamlessly
  const duplicatedItems = Array(6).fill(items).flat();

  const xTranslation = direction === 'left' ? ['0%', '-33.333%'] : ['-33.333%', '0%'];

  return (
    <div className="relative w-full overflow-hidden py-1.5 select-none">
      {/* Horizontal fade gradient masks for smooth edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-neutral-950 via-neutral-950/80 to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-3 w-max"
        animate={{
          x: xTranslation,
        }}
        transition={{
          ease: 'linear',
          duration: speed,
          repeat: Infinity,
        }}
      >
        {duplicatedItems.map((item, idx) => (
          <div
            key={`${item}-${idx}`}
            className="flex items-center px-4 py-2.5 rounded-lg bg-neutral-900/40 border border-neutral-900 backdrop-blur-sm text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700/80 hover:scale-105 transition-all duration-200 cursor-default"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 mr-2 shrink-0 animate-pulse" />
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default InfiniteMarquee;
