import React, { useEffect, useRef, useState } from 'react';

interface SquaresProps {
  direction?: 'up' | 'down' | 'left' | 'right' | 'diagonal';
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  className?: string;
}

export function Squares({
  direction = 'diagonal',
  speed = 0.4,
  borderColor = 'rgba(255, 255, 255, 0.03)',
  squareSize = 40,
  hoverFillColor = 'rgba(255, 255, 255, 0.05)',
  className = '',
}: SquaresProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSquare, setHoveredSquare] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offsetX = 0;
    let offsetY = 0;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || window.innerWidth;
      canvas.height = rect?.height || window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const gridX = Math.floor((mouseX - offsetX) / squareSize);
      const gridY = Math.floor((mouseY - offsetY) / squareSize);
      
      setHoveredSquare({ x: gridX, y: gridY });
    };

    const handleMouseLeave = () => {
      setHoveredSquare(null);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (direction === 'left' || direction === 'diagonal') offsetX -= speed;
      if (direction === 'right') offsetX += speed;
      if (direction === 'up' || direction === 'diagonal') offsetY -= speed;
      if (direction === 'down') offsetY += speed;

      offsetX %= squareSize;
      offsetY %= squareSize;

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;

      const numCols = Math.ceil(canvas.width / squareSize) + 2;
      const numRows = Math.ceil(canvas.height / squareSize) + 2;

      const startX = offsetX - squareSize;
      const startY = offsetY - squareSize;

      for (let i = 0; i < numCols; i++) {
        for (let j = 0; j < numRows; j++) {
          const x = startX + i * squareSize;
          const y = startY + j * squareSize;

          ctx.strokeRect(x, y, squareSize, squareSize);

          if (hoveredSquare) {
            const currentGridX = Math.floor((x - offsetX) / squareSize);
            const currentGridY = Math.floor((y - offsetY) / squareSize);

            if (currentGridX === hoveredSquare.x && currentGridY === hoveredSquare.y) {
              ctx.fillStyle = hoverFillColor;
              ctx.fillRect(x, y, squareSize, squareSize);
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [direction, speed, borderColor, squareSize, hoverFillColor, hoveredSquare]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-auto block ${className}`}
    />
  );
}

export default Squares;
