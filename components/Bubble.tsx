
import React, { useState } from 'react';
import { BubbleData, BubbleType } from '../types';

interface BubbleProps {
  data: BubbleData;
  onPop: (bubble: BubbleData) => void;
  isPaused: boolean;
  combo: number;
}

const Bubble: React.FC<BubbleProps> = ({ data, onPop, isPaused, combo }) => {
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
      case BubbleType.STICKY:
        return 'border-emerald-300 bg-emerald-700/50 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      case BubbleType.MULTIPLIER:
        return 'border-cyan-200 bg-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.6)]';
      case BubbleType.MAGNET:
        return 'border-purple-300 bg-purple-600/40 shadow-[0_0_20px_rgba(168,85,247,0.6)]';
      case BubbleType.FREEZE:
        return 'border-cyan-100 bg-cyan-200/40 shadow-[0_0_15px_rgba(165,243,252,0.6)]';
      default:
        return `border-white/30 ${data.color}`;
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case BubbleType.SLOW_MO: return <i className="fas fa-clock text-blue-100 opacity-90" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.BOMB: return <i className="fas fa-bomb text-red-100 opacity-90" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.GOLDEN: return <i className="fas fa-star text-yellow-50 opacity-100" style={{ fontSize: data.size * 0.55 }}></i>;
      case BubbleType.STICKY: return <i className="fas fa-flask text-emerald-100 opacity-90" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.MULTIPLIER: return <span className="text-white font-black drop-shadow-md" style={{ fontSize: data.size * 0.45 }}>x2</span>;
      case BubbleType.MAGNET: return <i className="fas fa-magnet text-purple-100 opacity-95" style={{ fontSize: data.size * 0.45 }}></i>;
      case BubbleType.FREEZE: return <i className="fas fa-snowflake text-cyan-50 opacity-100" style={{ fontSize: data.size * 0.45 }}></i>;
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
      }}
    >
      {/* Visual Radius Indicators */}
      {!isPopping && data.type === BubbleType.MAGNET && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-purple-400/10 bg-purple-500/5 blur-xl pointer-events-none animate-pulse"></div>
      )}
      {!isPopping && data.type === BubbleType.STICKY && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full border border-emerald-400/10 bg-emerald-500/5 blur-md pointer-events-none"></div>
      )}

      {/* Combo Aura */}
      {!isPopping && combo > 3 && (
        <div 
          className="absolute inset-[-10px] rounded-full animate-pulse border-4 border-emerald-400/20 blur-sm"
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
        className={`w-full h-full rounded-full border-2 shadow-inner flex items-center justify-center bubble-inner transition-transform duration-200 hover:scale-110 ${getTypeStyles()} ${isPopping ? 'popping' : ''}`}
        style={{
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {!isPopping && (
          <>
            {getIcon()}
            <div className="absolute top-[15%] right-[20%] w-1/4 h-1/4 bg-white/40 rounded-full blur-[1px] sparkle-effect"></div>
            <div className="absolute bottom-[20%] left-[25%] w-1/5 h-1/5 bg-white/10 rounded-full blur-[1px]"></div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(Bubble);
