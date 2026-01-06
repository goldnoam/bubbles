
// Add comment above each fix
// Fixing missing handleStart, adding button TTS, accessibility, theme toggle, and enhanced UI features
import React, { useState, useEffect } from 'react';
import { GameState, Level, Language, FontSize, GameSpeed } from '../types';
import { I18N } from '../constants';

interface GameUIProps {
  state: GameState; score: number; highScore: number; level: Level; lang: Language; fontSize: FontSize; gameSpeed: GameSpeed;
  onStart: () => void; onResume: () => void; onReset: () => void; onTogglePause: () => void;
  isMuted: boolean; onToggleMute: () => void;
  onLanguageChange: (l: Language) => void; onFontSizeChange: (s: FontSize) => void; onGameSpeedChange: (speed: GameSpeed) => void;
  onToggleTheme: () => void; isDark: boolean; combo: number; isMultiplierActive: boolean;
}

const GameUI: React.FC<GameUIProps> = ({ 
  state, score, highScore, level, lang, fontSize, gameSpeed,
  onStart, onResume, onReset, onTogglePause, 
  isMuted, onToggleMute, onLanguageChange, onFontSizeChange, onGameSpeedChange, onToggleTheme, isDark,
  combo, isMultiplierActive
}) => {
  const t = I18N[lang];
  const [searchValue, setSearchValue] = useState("");
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (displayScore < score) {
      const step = Math.max(1, Math.floor((score - displayScore) / 4));
      const tid = setTimeout(() => setDisplayScore(d => Math.min(d + step, score)), 40);
      return () => clearTimeout(tid);
    } else setDisplayScore(score);
  }, [score, displayScore]);

  // TTS for buttons using standard Web Speech API (without Gemini)
  const speak = (txt: string) => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(txt);
    const map: Record<string, string> = { 
      he: 'he-IL', en: 'en-US', zh: 'zh-CN', hi: 'hi-IN', de: 'de-DE', es: 'es-ES', fr: 'fr-FR' 
    };
    u.lang = map[lang] || 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const handleAction = (fn: () => void, txt: string) => { 
    speak(txt); 
    fn(); 
  };

  const exportStats = () => {
    const data = `Score: ${score}\nHigh Score: ${highScore}\nLevel: ${level.id}\nSearch: ${searchValue}`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = 'fizzy_pop_stats.txt'; 
    a.click();
    URL.revokeObjectURL(url);
    speak("Stats exported");
  };

  return (
    <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-between z-50 p-6 ${isDark ? 'text-white' : 'text-slate-900'} overflow-hidden transition-colors duration-500`}>
      {(state === GameState.PLAYING || state === GameState.PAUSED) && (
        <div className="w-full flex justify-between pointer-events-auto">
          <div className="flex gap-4">
            <div className={`p-4 rounded-xl border shadow-lg ${isDark ? 'bg-black/50 border-white/10' : 'bg-white/80 border-black/10'}`}>
              <div className="text-[10px] opacity-70 uppercase tracking-widest">{t.score}</div>
              <div className="text-3xl font-black text-emerald-500 flex items-center gap-2">
                {displayScore}
                {isMultiplierActive && <span className="text-xs bg-cyan-500 text-white px-2 rounded-full animate-bounce">X2</span>}
              </div>
            </div>
            <div className={`p-4 rounded-xl border shadow-lg hidden sm:block ${isDark ? 'bg-black/50 border-white/10' : 'bg-white/80 border-black/10'}`}>
              <div className="text-[10px] opacity-70 uppercase tracking-widest">{t.highScore}</div>
              <div className="text-3xl font-black text-yellow-500">{highScore}</div>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <button 
              onClick={() => handleAction(onToggleMute, isMuted ? "Unmuted" : "Muted")} 
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${isDark ? 'bg-black/50 border-white/10' : 'bg-white/80 border-black/10'}`} 
              aria-label="Mute Toggle"
            >
              <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
            </button>
            {state === GameState.PLAYING && (
              <button 
                onClick={() => handleAction(onTogglePause, t.pause)} 
                className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${isDark ? 'bg-black/50 border-white/10' : 'bg-white/80 border-black/10'}`} 
                aria-label="Pause"
              >
                <i className="fas fa-pause"></i>
              </button>
            )}
          </div>
        </div>
      )}

      {state === GameState.START && (
        <div className={`backdrop-blur-xl p-8 rounded-3xl border text-center max-w-md w-full pointer-events-auto shadow-2xl scale-in overflow-y-auto ${isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-slate-200'}`} role="dialog">
          <h1 className="text-6xl font-black mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-blue-600">{t.title}</h1>
          
          {/* Fixing line 83 error: handleStart to onStart */}
          <button 
            onClick={() => handleAction(onStart, t.start)} 
            className="w-full py-5 bg-emerald-500 text-white font-black text-2xl rounded-2xl shadow-xl shadow-emerald-500/20 mb-8 active:scale-95 transition-transform"
            aria-label={t.start}
          >
            {t.start}
          </button>

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <select 
              value={lang} 
              onChange={e => onLanguageChange(e.target.value as any)} 
              className={`p-2 rounded-lg text-sm border outline-none ${isDark ? 'bg-white/10 border-white/10' : 'bg-slate-100 border-slate-300'}`}
              aria-label="Select Language"
            >
              {Object.keys(I18N).map(l => <option key={l} value={l} className={isDark ? "bg-slate-800" : "bg-white"}>{I18N[l as keyof typeof I18N].lang}</option>)}
            </select>

            <button 
              onClick={() => handleAction(onToggleTheme, isDark ? "Light mode" : "Dark mode")} 
              className={`w-12 h-10 rounded-lg flex items-center justify-center border transition-colors ${isDark ? 'bg-slate-800 border-white/20 text-yellow-400' : 'bg-white border-slate-300 text-slate-800'}`}
              aria-label="Toggle Theme"
            >
              <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>

            <div className={`flex p-1 rounded-lg border ${isDark ? 'bg-white/10 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
              {(['small', 'medium', 'large'] as FontSize[]).map(s => (
                <button 
                  key={s} 
                  onClick={() => handleAction(() => onFontSizeChange(s), `Font ${s}`)} 
                  className={`px-3 py-1 text-xs font-bold rounded transition-all ${fontSize === s ? 'bg-emerald-500 text-white' : isDark ? 'text-white/60' : 'text-slate-500'}`}
                >
                  {s[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div 
            className="flex gap-2" 
            onDragOver={e => e.preventDefault()} 
            onDrop={e => { 
              e.preventDefault(); 
              const text = e.dataTransfer.getData('text');
              if (text) setSearchValue(text);
            }}
          >
            <div className="relative flex-1">
              <input 
                list="flavors" 
                value={searchValue} 
                onChange={e => setSearchValue(e.target.value)} 
                placeholder={t.searchPlaceholder} 
                className={`w-full p-3 rounded-xl outline-none text-sm border ${isDark ? 'bg-white/10 border-white/10 text-white placeholder:text-white/30' : 'bg-slate-100 border-slate-300 text-slate-900'}`} 
              />
              <datalist id="flavors">
                <option value="Cola"/><option value="Lime"/><option value="Orange"/><option value="Grape"/><option value="Soda"/>
              </datalist>
              {searchValue && (
                <button 
                  onClick={() => { setSearchValue(""); speak("Cleared"); }} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50"
                  aria-label="Clear input"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            <button 
              onClick={exportStats} 
              className={`w-12 rounded-xl flex items-center justify-center border transition-all ${isDark ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}
              aria-label="Export"
            >
              <i className="fas fa-download"></i>
            </button>
          </div>
        </div>
      )}

      {state === GameState.PAUSED && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto">
          <div className={`p-8 rounded-3xl border text-center w-72 shadow-2xl ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <h2 className="text-3xl font-black mb-8">{t.pause}</h2>
            <button onClick={() => handleAction(onResume, t.resume)} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold mb-4">Resume</button>
            <button onClick={() => handleAction(onReset, t.reset)} className={`w-full py-3 rounded-xl text-sm opacity-60 font-bold border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-300'}`}>Reset</button>
          </div>
        </div>
      )}

      {/* Footer with requested info */}
      <footer className="w-full text-center pointer-events-auto text-[10px] font-bold opacity-60 pb-4 mt-auto">
        <div className="flex flex-col gap-1 items-center">
          <span>(C) Noam Gold AI 2026</span>
          <span>Send Feedback: <a href="mailto:goldnoamai@gmail.com" className="hover:text-emerald-400 underline decoration-dotted">goldnoamai@gmail.com</a></span>
        </div>
      </footer>
    </div>
  );
};

export default GameUI;
