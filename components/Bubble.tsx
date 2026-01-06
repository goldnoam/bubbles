import React, { useState } from 'react';
import { BubbleData, BubbleType } from '../types';

interface BubbleProps {
  data: BubbleData;
  onPop: (bubble: BubbleData) => void;
  isPaused: boolean;
  isGlobalFrozen?: boolean;
  combo: number;
}

const Bubble: React.FC<BubbleProps> = ({ data, onPop, isPaused, isGlobalFrozen, combo }) => {
  const [isPopping, setIsPopping] = useState(false);

  const handlePop = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isPopping || isPaused) return;
    setIsPopping(true);
    setTimeout(() => onPop(data), 50);
  };

  const getTypeStyles = () => {
    if (isGlobalFrozen) return 'border-cyan-200 bg-cyan-400/30 shadow-[inset_0_0_15px_rgba(255,255,255,0.7)] blur-[0.5px] scale-[0.98]';
    switch (data.type) {
      case BubbleType.SLOW_MO: return 'border-blue-300 bg-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.6)]';
      case BubbleType.BOMB: return 'border-red-400 bg-red-600/50 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse';
      case BubbleType.GOLDEN: return 'border-yellow-200 bg-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.8)]';
      case BubbleType.MULTIPLIER: return 'border-cyan-200 bg-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.7)]';
      case BubbleType.MAGNET: return 'border-purple-300 bg-purple-600/50 shadow-[0_0_25px_rgba(168,85,247,0.7)] animate-pulse';
      case BubbleType.FREEZE: return 'border-cyan-100 bg-cyan-200/70 shadow-[0_0_25px_rgba(165,243,252,0.9)] animate-pulse';
      default: return `border-white/50 shadow-[0_4px_10px_rgba(0,0,0,0.1)] ${data.color}`;
    }
  };

  const getIcon = () => {
    if (isGlobalFrozen) return <i className="fas fa-snowflake text-white/40" style={{ fontSize: data.size * 0.4 }}></i>;
    switch (data.type) {
      case BubbleType.SLOW_MO: return <i className="fas fa-clock text-blue-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.BOMB: return <i className="fas fa-bomb text-red-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.GOLDEN: return <i className="fas fa-star text-yellow-50" style={{ fontSize: data.size * 0.55 }}></i>;
      case BubbleType.MULTIPLIER: return <span className="text-white font-black drop-shadow-md" style={{ fontSize: data.size * 0.4 }}>x2</span>;
      case BubbleType.MAGNET: return <i className="fas fa-magnet text-purple-100" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.FREEZE: return <i className="fas fa-snowflake text-cyan-50" style={{ fontSize: data.size * 0.45 }}></i>;
      default: return null;
    }
  };

  return (
    <div
      className="absolute select-none pointer-events-auto"
      style={{
        width: `${data.size}px`, height: `${data.size}px`,
        transform: `translate3d(${data.x}px, ${data.y}px, 0) rotate(${data.rotation}deg)`,
        zIndex: isPopping ? 100 : 1
      }}
    >
      {!isPopping && data.type === BubbleType.MAGNET && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-purple-400/20 bg-purple-500/5 blur-2xl animate-pulse pointer-events-none"></div>
      )}
      <div
        onClick={handlePop} onTouchStart={handlePop}
        className={`w-full h-full rounded-full border-2 shadow-inner flex items-center justify-center bubble-inner transition-all duration-300 hover:scale-110 ${getTypeStyles()} ${isPopping ? 'popping' : ''}`}
        style={{ animationPlayState: (isPaused || isGlobalFrozen) ? 'paused' : 'running' }}
      >
        {!isPopping && (
          <>
            {getIcon()}
            <div className={`absolute top-[15%] right-[20%] w-1/4 h-1/4 ${isGlobalFrozen ? 'bg-white/90' : 'bg-white/40'} rounded-full blur-[1px]`}></div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(Bubble);