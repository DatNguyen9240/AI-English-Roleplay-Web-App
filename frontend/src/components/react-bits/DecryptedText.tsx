import React, { useEffect, useState, useRef } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  className?: string;
  animateOn?: 'hover' | 'load';
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:<>?';

export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 8,
  sequential = true,
  className = '',
  animateOn = 'hover',
}: DecryptedTextProps): React.ReactElement {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDecryption = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    let iterations = 0;
    
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setDisplayText(() => {
        return text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            
            if (sequential) {
              const threshold = Math.floor(iterations / maxIterations);
              if (index < threshold) return char;
            } else {
              if (iterations >= maxIterations) return char;
            }

            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
      });

      iterations++;

      if (iterations >= text.length * maxIterations) {
        setIsAnimating(false);
        setDisplayText(text);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, speed);
  };

  useEffect(() => {
    if (animateOn === 'load') {
      startDecryption();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);

  return (
    <span
      className={`inline-block font-mono ${className} cursor-default`}
      onMouseEnter={animateOn === 'hover' ? startDecryption : undefined}
    >
      {displayText}
    </span>
  );
}

export default DecryptedText;
