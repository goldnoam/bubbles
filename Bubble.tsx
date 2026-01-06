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
    
    // Only allow popping special bubbles when frozen if they are the freeze bubble itself (unlikely but safe)
    if (isGlobalFrozen && data.type !== BubbleType.FREEZE) {
      // Logic for global frozen state interaction
    }
    
    setIsPopping(true);
    onPop(data);
  };

  const getTypeStyles = () => {
    if (isGlobalFrozen) {
      return 'border-cyan-200 bg-cyan-400/30 shadow-[inset_0_0_15px_rgba(255,255,255,0.7)] scale-[0.98] blur-[0.5px]';
    }

    switch (data.type) {
      case BubbleType.SLOW_MO:
        return 'border-blue-300 bg-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.6)]';
      case BubbleType.BOMB:
        return 'border-red-400 bg-red-600/50 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse';
      case BubbleType.GOLDEN:
        return 'border-yellow-200 bg-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.8)]';
      case BubbleType.STICKY:
        return 'border-emerald-300 bg-emerald-700/60 shadow-[0_0_15px_rgba(16,185,129,0.6)]';
      case BubbleType.MULTIPLIER:
        return 'border-cyan-200 bg-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.7)]';
      case BubbleType.MAGNET:
        return 'border-purple-300 bg-purple-600/50 shadow-[0_0_25px_rgba(168,85,247,0.7)]';
      case BubbleType.FREEZE:
        return 'border-cyan-100 bg-cyan-200/70 shadow-[0_0_25px_rgba(165,243,252,0.9)] animate-pulse';
      default:
        // Increased visibility for normal bubbles
        return `border-white/50 shadow-[0_4px_10px_rgba(0,0,0,0.1)] ${data.color}`;
    }
  };

  const getIcon = () => {
    if (isGlobalFrozen) return <i className="fas fa-snowflake text-white/40" style={{ fontSize: data.size * 0.4 }}></i>;

    switch (data.type) {
      case BubbleType.SLOW_MO: return <i className="fas fa-clock text-blue-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.BOMB: return <i className="fas fa-bomb text-red-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.GOLDEN: return <i className="fas fa-star text-yellow-50" style={{ fontSize: data.size * 0.55 }}></i>;
      case BubbleType.STICKY: return <i className="fas fa-flask text-emerald-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.MULTIPLIER: return <span className="text-white font-black drop-shadow-md" style={{ fontSize: data.size * 0.45 }}>x2</span>;
      case BubbleType.MAGNET: return <i className="fas fa-magnet text-purple-50" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.FREEZE: return <i className="fas fa-snowflake text-cyan-50" style={{ fontSize: data.size * 0.45 }}></i>;
      default: return null;
    }
  };

  return (
    <div
      className="absolute select-none cursor-pointer"
      style={{
        left: 0,
        top: 0,
        width: `${data.size}px`,
        height: `${data.size}px`,
        transform: `translate3d(${data.x}px, ${data.y}px, 0) rotate(${data.rotation}deg)`,
        zIndex: isPopping ? 100 : 1,
      }}
    >
      {/* Visual Radius Indicators */}
      {!isPopping && data.type === BubbleType.MAGNET && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-purple-400/20 bg-purple-500/10 blur-xl pointer-events-none animate-pulse"></div>
      )}
      {!isPopping && data.type === BubbleType.STICKY && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full border border-emerald-400/20 bg-emerald-500/10 blur-md pointer-events-none"></div>
      )}

      {/* Combo Aura */}
      {!isPopping && !isGlobalFrozen && combo > 3 && (
        <div 
          className="absolute inset-[-10px] rounded-full animate-pulse border-4 border-emerald-400/30 blur-sm"
          style={{ opacity: Math.min(combo * 0.1, 0.8) }}
        ></div>
      )}

      {/* Explosion Particles for Bomb */}
      {isPopping && data.type === BubbleType.BOMB && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-2 h-2 bg-red-400 rounded-full"
              style={{
                '--tw-translate-x': `${Math.cos(i * 30 * Math.PI / 180) * 120}px`,
                '--tw-translate-y': `${Math.sin(i * 30 * Math.PI / 180) * 120}px`,
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
        className={`w-full h-full rounded-full border-2 shadow-inner flex items-center justify-center bubble-inner transition-all duration-300 hover:scale-110 ${getTypeStyles()} ${isPopping ? 'popping' : ''}`}
        style={{
          animationPlayState: (isPaused || isGlobalFrozen) ? 'paused' : 'running',
        }}
      >
        {!isPopping && (
          <>
            {getIcon()}
            <div className={`absolute top-[15%] right-[20%] w-1/4 h-1/4 ${isGlobalFrozen ? 'bg-white/80' : 'bg-white/40'} rounded-full blur-[1px] sparkle-effect`}></div>
            <div className="absolute bottom-[20%] left-[25%] w-1/5 h-1/5 bg-white/10 rounded-full blur-[1px]"></div>
            {isGlobalFrozen && <div className="absolute inset-0 bg-cyan-100/10 rounded-full backdrop-blur-[0.5px]"></div>}
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(Bubble);