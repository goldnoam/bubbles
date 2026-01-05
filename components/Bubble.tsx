
import React, { useState } from 'react';
import { BubbleData, BubbleType } from '../types';

interface BubbleProps {
  data: BubbleData;
  onPop: (bubble: BubbleData) => void;
  isPaused: boolean;
}

const Bubble: React.FC<BubbleProps> = ({ data, onPop, isPaused }) => {
  const [isPopping, setIsPopping] = useState(false);

  const handlePop = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isPopping || isPaused) return;
    setIsPopping(true);
    onPop(data);
  };

  const getTypeStyles = () => {
    switch (data.type) {
      case BubbleType.SLOW_MO:
        return 'border-blue-300 bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      case BubbleType.BOMB:
        return 'border-red-400 bg-red-600/40 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse';
      case BubbleType.GOLDEN:
        return 'border-yellow-200 bg-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.6)]';
      default:
        return `border-white/30 ${data.color}`;
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case BubbleType.SLOW_MO: return <i className="fas fa-clock text-blue-100 opacity-90" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.BOMB: return <i className="fas fa-bomb text-red-100 opacity-90" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.GOLDEN: return <i className="fas fa-star text-yellow-50 opacity-100" style={{ fontSize: data.size * 0.55 }}></i>;
      default: return null;
    }
  };

  return (
    <div
      className="absolute bubble-container"
      style={{
        left: `${data.x}%`,
        width: `${data.size}px`,
        height: `${data.size}px`,
        animationDuration: `${data.speed}s`,
        animationPlayState: isPaused ? 'paused' : 'running',
      }}
    >
      {/* Trail particles */}
      {!isPopping && !isPaused && (
        <>
          <div className="absolute left-1/4 bottom-0 w-2 h-2 bg-white/40 rounded-full trail-dot" style={{ animationDelay: '0s' }}></div>
          <div className="absolute left-1/2 bottom-[-10px] w-1.5 h-1.5 bg-white/30 rounded-full trail-dot" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute left-3/4 bottom-[-5px] w-2.5 h-2.5 bg-white/20 rounded-full trail-dot" style={{ animationDelay: '0.4s' }}></div>
        </>
      )}

      {/* Explosion Particles for Bomb */}
      {isPopping && data.type === BubbleType.BOMB && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-2 h-2 bg-red-400 rounded-full"
              style={{
                '--tw-translate-x': `${Math.cos(i * 30 * Math.PI / 180) * 80}px`,
                '--tw-translate-y': `${Math.sin(i * 30 * Math.PI / 180) * 80}px`,
                animation: 'particle-out 0.4s ease-out forwards'
              } as any}
            />
          ))}
          <div className="absolute inset-0 rounded-full border-4 border-red-500/50 bomb-explode"></div>
        </div>
      )}

      <div
        onClick={handlePop}
        onTouchStart={handlePop}
        className={`w-full h-full rounded-full border-2 shadow-inner flex items-center justify-center bubble-inner transition-transform duration-200 hover:scale-110 ${getTypeStyles()} ${isPopping ? 'popping' : ''}`}
        style={{
          animationDuration: `${data.speed * 0.4}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {!isPopping && (
          <>
            {getIcon()}
            <div className="absolute top-[15%] right-[20%] w-1/4 h-1/4 bg-white/40 rounded-full blur-[1px] sparkle-effect"></div>
            <div className="absolute bottom-[20%] left-[25%] w-1/5 h-1/5 bg-white/10 rounded-full blur-[1px]"></div>
            {data.type !== BubbleType.NORMAL && (
              <div className="absolute inset-0 rounded-full bg-white/5 blur-md"></div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(Bubble);
