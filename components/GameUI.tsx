
import React from 'react';
import { GameState, Level } from '../types';

interface GameUIProps {
  state: GameState;
  score: number;
  highScore: number;
  level: Level;
  onStart: () => void;
  onResume: () => void;
  onReset: () => void;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const GameUI: React.FC<GameUIProps> = ({ state, score, highScore, level, onStart, onResume, onReset, onTogglePause, isMuted, onToggleMute }) => {
  const isPlaying = state === GameState.PLAYING;
  const isPaused = state === GameState.PAUSED;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-50 text-white">
      {/* HUD */}
      {(isPlaying || isPaused || state === GameState.LEVEL_UP) && (
        <div className="absolute top-8 left-8 right-8 flex justify-between pointer-events-auto">
          <div className="flex gap-4">
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-lg">
              <div className="text-xs opacity-70 uppercase tracking-widest">ניקוד</div>
              <div className="text-3xl font-black text-emerald-400 leading-none">{score}</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-lg">
              <div className="text-xs opacity-70 uppercase tracking-widest">שיא</div>
              <div className="text-3xl font-black text-yellow-400 leading-none">{highScore}</div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 text-right shadow-lg min-w-[140px]">
              <div className="text-xs opacity-70 uppercase tracking-widest">שלב: {level.name}</div>
              <div className="text-xl font-bold">יעד: {level.targetScore}</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={onToggleMute}
                className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all active:scale-90"
                title={isMuted ? "בטל השתקה" : "השתק"}
              >
                <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-xl`}></i>
              </button>
              {isPlaying && (
                <button 
                  onClick={onTogglePause}
                  className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all active:scale-90"
                  title="השהה"
                >
                  <i className="fas fa-pause text-xl"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlays */}
      {state === GameState.START && (
        <div className="bg-black/60 backdrop-blur-xl p-10 rounded-3xl border border-white/20 text-center max-w-md pointer-events-auto shadow-2xl scale-in">
          <h1 className="text-6xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-blue-500">FIZZY POP</h1>
          <div className="mb-6 text-yellow-400 font-bold text-xl uppercase tracking-widest">שיא: {highScore}</div>
          <p className="text-lg opacity-80 mb-8 leading-relaxed">אתה בתוך בקבוק משקה מוגז! פוצץ בועות לקצב ה"פופקורן". בועות זהב שוות יותר!</p>
          <button 
            onClick={onStart}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-2xl rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/30"
          >
            התחל לשחק
          </button>
        </div>
      )}

      {state === GameState.PAUSED && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center fade-overlay-bg">
          <div className="bg-black/70 backdrop-blur-2xl p-12 rounded-3xl border border-white/20 text-center max-w-sm pointer-events-auto shadow-2xl overlay-card">
            <h2 className="text-4xl font-black mb-6">הפסקה</h2>
            <div className="flex flex-col gap-4">
              <button 
                onClick={onResume}
                className="w-full py-4 bg-emerald-500 text-white font-bold text-xl rounded-2xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                המשך
              </button>
              <button 
                onClick={onReset}
                className="w-full py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors active:scale-95"
              >
                איפוס משחק
              </button>
            </div>
          </div>
        </div>
      )}

      {state === GameState.LEVEL_UP && (
        <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm flex items-center justify-center fade-overlay-bg">
          <div className="bg-emerald-600/90 backdrop-blur-xl p-12 rounded-[2rem] border border-white/30 text-center pointer-events-auto shadow-2xl level-up-anim max-w-sm">
            <div className="mb-4 bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <i className="fas fa-arrow-up text-4xl text-white"></i>
            </div>
            <h2 className="text-5xl font-black mb-2 text-white drop-shadow-lg">שלב הבא!</h2>
            <p className="text-2xl font-bold text-emerald-100 mb-6 drop-shadow-md">עברת ל{level.name}</p>
            <div className="text-xs uppercase font-black tracking-[0.2em] text-white/70 animate-pulse">מתכונן למזיגה חדשה...</div>
          </div>
        </div>
      )}

      {state === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md flex items-center justify-center fade-overlay-bg">
          <div className="bg-red-600/90 backdrop-blur-xl p-12 rounded-[2rem] border border-white/30 text-center pointer-events-auto shadow-2xl overlay-card max-w-sm">
            <div className="mb-6 w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white text-5xl">
                <i className="fas fa-skull"></i>
            </div>
            <h2 className="text-6xl font-black mb-2 italic tracking-tighter text-white drop-shadow-lg">POPPED!</h2>
            <div className="mb-2 text-3xl font-bold text-red-50">ניקוד: {score}</div>
            <div className="mb-8 text-yellow-300 font-black text-2xl uppercase tracking-wider drop-shadow-md">שיא: {highScore}</div>
            <button 
              onClick={onReset}
              className="w-full py-5 bg-white text-red-600 font-black text-2xl rounded-2xl hover:bg-red-50 active:scale-95 transition-all shadow-xl shadow-black/20"
            >
              נסה שוב
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameUI;
