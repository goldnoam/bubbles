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
    // Tiny delay to show the popping animation start
    setTimeout(() => onPop(data), 50);
  };

  const getTypeStyles = () => {
    if (isGlobalFrozen) {
      return 'border-cyan-200 bg-cyan-400/40 shadow-[inset_0_0_15px_rgba(255,255,255,0.7)] scale-[0.98] blur-[0.5px]';
    }

    switch (data.type) {
      case BubbleType.SLOW_MO:
        return 'border-blue-400 bg-blue-600/50 shadow-[0_0_15px_rgba(59,130,246,0.6)]';
      case BubbleType.BOMB:
        return 'border-red-400 bg-red-700/60 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse';
      case BubbleType.GOLDEN:
        return 'border-yellow-200 bg-yellow-500/60 shadow-[0_0_25px_rgba(234,179,8,0.8)]';
      case BubbleType.STICKY:
        return 'border-emerald-300 bg-emerald-800/70 shadow-[0_0_15px_rgba(16,185,129,0.7)]';
      case BubbleType.MULTIPLIER:
        return 'border-cyan-200 bg-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.7)]';
      case BubbleType.MAGNET:
        return 'border-purple-300 bg-purple-700/70 shadow-[0_0_30px_rgba(168,85,247,0.9)] animate-pulse';
      case BubbleType.FREEZE:
        return 'border-cyan-100 bg-cyan-300/70 shadow-[0_0_25px_rgba(165,243,252,0.9)] animate-pulse';
      default:
        return `border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${data.color}`;
    }
  };

  const getIcon = () => {
    if (isGlobalFrozen) return <i className="fas fa-snowflake text-white/50" style={{ fontSize: data.size * 0.4 }}></i>;

    switch (data.type) {
      case BubbleType.SLOW_MO: return <i className="fas fa-clock text-blue-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.BOMB: return <i className="fas fa-bomb text-red-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.GOLDEN: return <i className="fas fa-star text-yellow-50" style={{ fontSize: data.size * 0.55 }}></i>;
      case BubbleType.STICKY: return <i className="fas fa-flask text-emerald-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.MULTIPLIER: return <span className="text-white font-black drop-shadow-md" style={{ fontSize: data.size * 0.45 }}>x2</span>;
      case BubbleType.MAGNET: return <i className="fas fa-magnet text-purple-100" style={{ fontSize: data.size * 0.5 }}></i>;
      case BubbleType.FREEZE: return <i className="fas fa-snowflake text-cyan-50" style={{ fontSize: data.size * 0.45 }}></i>;
      default: return null;
    }
  };

  return (
    <div
      className="absolute select-none pointer-events-auto cursor-pointer"
      style={{
        left: 0,
        top: 0,
        width: `${data.size}px`,
        height: `${data.size}px`,
        transform: `translate3d(${data.x}px, ${data.y}px, 0) rotate(${data.rotation}deg)`,
        zIndex: isPopping ? 100 : 1,
      }}
      onClick={handlePop}
      onTouchStart={handlePop}
    >
      {/* Magnetic Field Effect */}
      {!isPopping && data.type === BubbleType.MAGNET && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-purple-500/20 bg-purple-600/5 blur-2xl pointer-events-none animate-pulse"></div>
      )}

      {/* Explosion Particles for Bomb */}
      {isPopping && data.type === BubbleType.BOMB && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-[-100px] rounded-full border-[10px] border-red-500/40 bomb-explode"></div>
        </div>
      )}

      <div
        className={`w-full h-full rounded-full border-2 shadow-inner flex items-center justify-center bubble-inner transition-all duration-300 hover:scale-110 ${getTypeStyles()} ${isPopping ? 'popping' : ''}`}
        style={{ animationPlayState: (isPaused || isGlobalFrozen) ? 'paused' : 'running' }}
      >
        {!isPopping && (
          <>
            {getIcon()}
            <div className={`absolute top-[15%] right-[20%] w-1/4 h-1/4 ${isGlobalFrozen ? 'bg-white/90' : 'bg-white/60'} rounded-full blur-[1px] sparkle-effect`}></div>
            <div className="absolute bottom-[20%] left-[25%] w-1/5 h-1/5 bg-white/20 rounded-full blur-[1px]"></div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(Bubble);