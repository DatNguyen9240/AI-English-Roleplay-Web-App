import React from 'react';
import { motion } from 'framer-motion';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
}

export function BlurText({
  text,
  delay = 40,
  className = '',
  animateBy = 'letters',
}: BlurTextProps): React.ReactElement {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay / 1000,
      },
    },
  };

  const childVariants = {
    hidden: { filter: 'blur(10px)', opacity: 0, y: 5 },
    visible: {
      filter: 'blur(0px)',
      opacity: 1,
      y: 0,
      transition: {
        filter: { type: 'tween', duration: 0.2 },
        opacity: { duration: 0.25 },
        y: { type: 'spring', damping: 12, stiffness: 100 },
      },
    },
  };

  return (
    <motion.span
      className={`inline-block ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {elements.map((el, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={childVariants}
          style={{ marginRight: animateBy === 'words' ? '0.25em' : '0' }}
        >
          {el === ' ' ? '\u00A0' : el}
        </motion.span>
      ))}
    </motion.span>
  );
}
export default BlurText;
