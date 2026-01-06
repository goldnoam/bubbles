import React, { useState, useEffect } from 'react';
import { GameState, Level, Language, FontSize, GameSpeed } from '../types';
import { I18N } from '../constants';

interface GameUIProps {
  state: GameState;
  score: number;
  highScore: number;
  level: Level;
  lang: Language;
  fontSize: FontSize;
  gameSpeed: GameSpeed;
  onStart: () => void;
  onResume: () => void;
  onReset: () => void;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onLanguageChange: (l: Language) => void;
  onFontSizeChange: (s: FontSize) => void;
  onGameSpeedChange: (speed: GameSpeed) => void;
  onToggleTheme: () => void;
  isDark: boolean;
  combo: number;
}

const GameUI: React.FC<GameUIProps> = ({ 
  state, score, highScore, level, lang, fontSize, gameSpeed,
  onStart, onResume, onReset, onTogglePause, 
  isMuted, onToggleMute, onLanguageChange, onFontSizeChange, onGameSpeedChange, onToggleTheme, isDark,
  combo
}) => {
  const isPlaying = state === GameState.PLAYING;
  const isPaused = state === GameState.PAUSED;
  const t = I18N[lang];
  const [searchValue, setSearchValue] = useState("");
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (displayScore < score) {
      const diff = score - displayScore;
      const step = Math.max(1, Math.floor(diff / 5));
      const timeout = setTimeout(() => {
        setDisplayScore(prev => Math.min(prev + step, score));
      }, 40);
      return () => clearTimeout(timeout);
    } else if (displayScore > score) {
      setDisplayScore(score);
    }
  }, [score, displayScore]);

  // Accessibility: Native Browser Text-to-Speech
  const speak = (text: string) => {
    if (isMuted) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // Attempt to match language
    const langMap: Record<string, string> = {
      he: 'he-IL', en: 'en-US', zh: 'zh-CN', hi: 'hi-IN', de: 'de-DE', es: 'es-ES', fr: 'fr-FR'
    };
    utterance.lang = langMap[lang] || 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleAction = (fn: () => void, text: string) => {
    speak(text);
    fn();
  };

  const flavors = [t.cola, t.lime, t.orange, t.grape, t.soda];
  const filteredFlavors = searchValue ? flavors.filter(f => f.toLowerCase().includes(searchValue.toLowerCase())) : [];

  const handleExport = () => {
    const data = `
Fizzy Pop Master - Game Stats
----------------------------
Score: ${score}
High Score: ${highScore}
Level: ${level.id} (${t[level.nameKey as keyof typeof t]})
Speed: ${gameSpeed}x
Language: ${lang}
Last Search: ${searchValue || 'None'}
Timestamp: ${new Date().toLocaleString()}
`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fizzy_pop_stats_${Date.now()}.txt`;
    link.click();
    speak("Stats Exported");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text");
    if (data) {
        setSearchValue(data);
        speak(`Imported: ${data}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between z-50 text-white p-6 overflow-hidden">
      {(isPlaying || isPaused || state === GameState.LEVEL_UP) && (
        <div className="w-full flex justify-between pointer-events-auto">
          <div className="flex gap-4">
            <div 
              className={`bg-black/40 dark:bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-lg transition-transform ${displayScore < score ? 'scale-110' : 'scale-100'}`} 
              aria-live="polite"
              aria-label={`${t.score}: ${score}`}
            >
              <div className="text-[10px] opacity-70 uppercase tracking-widest">{t.score}</div>
              <div className="text-3xl font-black text-emerald-400 leading-none">{displayScore}</div>
            </div>
            <div className="bg-black/40 dark:bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-lg" aria-label={`${t.highScore}: ${highScore}`}>
              <div className="text-[10px] opacity-70 uppercase tracking-widest">{t.highScore}</div>
              <div className="text-3xl font-black text-yellow-400 leading-none">{highScore}</div>
            </div>
          </div>

          {combo > 1 && (
            <div className="absolute left-1/2 -translate-x-1/2 top-20 flex flex-col items-center animate-bounce">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-orange-500 drop-shadow-lg">
                x{(1 + (combo * 0.2)).toFixed(1)}
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-white/80">COMBO {combo}</div>
            </div>
          )}
          
          <div className="flex flex-col items-end gap-2">
            <div className="bg-black/40 dark:bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-right-custom shadow-lg min-w-[140px]" role="status">
              <div className="text-[10px] opacity-70 uppercase tracking-widest">{t.level}: {t[level.nameKey as keyof typeof t]}</div>
              <div className="text-xl font-bold">{t.target}: {level.targetScore}</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAction(onToggleMute, isMuted ? "Audio Enabled" : "Audio Muted")}
                className="w-12 h-12 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all active:scale-90"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-xl`}></i>
              </button>
              {isPlaying && (
                <button 
                  onClick={() => handleAction(onTogglePause, t.pause)}
                  className="w-12 h-12 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all active:scale-90"
                  aria-label="Pause"
                >
                  <i className="fas fa-pause text-xl"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center w-full">
        {state === GameState.START && (
          <div className="bg-black/60 dark:bg-black/80 backdrop-blur-xl p-10 rounded-3xl border border-white/20 text-center max-w-md pointer-events-auto shadow-2xl scale-in" role="dialog" aria-labelledby="start-title">
            <h1 id="start-title" className="text-6xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-blue-500">{t.title}</h1>
            <div className="mb-6 text-yellow-400 font-bold text-xl uppercase tracking-widest">{t.highScore}: {highScore}</div>
            <p className="text-lg opacity-80 mb-6 leading-relaxed">{t.instruction}</p>
            
            {/* Input with drag/drop & autocomplete & clear */}
            <div 
                className="relative mb-6 text-left-custom" 
                onDrop={handleDrop} 
                onDragOver={handleDragOver}
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-sm text-white transition-colors"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    aria-label="Search Flavors"
                    aria-autocomplete="list"
                  />
                  {searchValue && (
                    <button 
                        onClick={() => { setSearchValue(""); speak("Cleared"); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        aria-label="Clear Search"
                    >
                      <i className="fas fa-times-circle"></i>
                    </button>
                  )}
                </div>
                <button 
                    onClick={handleExport} 
                    className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-blue-500/20 border border-white/10 transition-colors" 
                    title="Export Stats" 
                    aria-label="Export Stats"
                >
                  <i className="fas fa-file-export"></i>
                </button>
              </div>
              
              {filteredFlavors.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100] max-h-40 overflow-y-auto" role="listbox">
                  {filteredFlavors.map(f => (
                    <div 
                        key={f} 
                        className="px-4 py-3 hover:bg-emerald-500/30 cursor-pointer text-sm border-b border-white/5 last:border-0" 
                        onClick={() => { setSearchValue(f); speak(f); }}
                        role="option"
                    >
                        {f}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => handleAction(onStart, t.start)}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-2xl rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/30 mb-8"
              aria-label="Start Game"
            >
              {t.start}
            </button>

            <div className="flex flex-col gap-5 border-t border-white/10 pt-6">
              <div className="flex flex-wrap justify-center gap-3">
                <select 
                  className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none border border-white/20 text-white cursor-pointer hover:bg-white/20 transition-colors" 
                  value={lang} 
                  onChange={(e) => { onLanguageChange(e.target.value as Language); speak("Language Changed"); }}
                  aria-label="Change Language"
                >
                  {Object.keys(I18N).map(l => <option key={l} value={l} className="bg-slate-900">{I18N[l as keyof typeof I18N].lang}</option>)}
                </select>
                
                <div className="flex bg-white/10 rounded-lg border border-white/20 p-1">
                  {(['small', 'medium', 'large'] as FontSize[]).map(s => (
                    <button 
                        key={s} 
                        onClick={() => { onFontSizeChange(s); speak(`Font size ${s}`); }} 
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${fontSize === s ? 'bg-emerald-500 text-white shadow-md' : 'hover:bg-white/10 text-white/70'}`} 
                        aria-label={`Font size ${s}`}
                    >
                      {s === 'small' ? 'A' : s === 'medium' ? 'A+' : 'A++'}
                    </button>
                  ))}
                </div>

                <button 
                    onClick={() => { onToggleTheme(); speak("Theme Toggled"); }} 
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border border-white/20 hover:bg-white/20 transition-all ${isDark ? 'bg-white/5 text-blue-300' : 'bg-white/20 text-yellow-400'}`} 
                    aria-label="Toggle Theme"
                >
                  <i className={`fas ${isDark ? 'fa-moon' : 'fa-sun'} text-lg`}></i>
                </button>
              </div>
              
              <div className="flex flex-col items-center gap-2 w-full max-w-xs mx-auto">
                <div className="flex justify-between w-full text-[10px] uppercase font-bold tracking-widest opacity-60 px-1">
                  <span>{t.gameSpeed}</span>
                  <span>{gameSpeed.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" min="0.5" max="2.0" step="0.1" value={gameSpeed} 
                  onChange={(e) => onGameSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  aria-label="Adjust Game Speed"
                />
              </div>
            </div>
          </div>
        )}

        {state === GameState.PAUSED && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center fade-overlay-bg">
            <div className="bg-slate-900/80 backdrop-blur-2xl p-12 rounded-3xl border border-white/20 text-center max-w-sm pointer-events-auto shadow-2xl overlay-card" role="dialog" aria-labelledby="pause-title">
              <h2 id="pause-title" className="text-4xl font-black mb-6 tracking-tighter">{t.pause}</h2>
              <div className="flex flex-col gap-4">
                <button 
                    onClick={() => handleAction(onResume, t.resume)} 
                    className="w-full py-4 bg-emerald-500 text-white font-bold text-xl rounded-2xl active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                    {t.resume}
                </button>
                <button 
                    onClick={() => handleAction(onReset, t.reset)} 
                    className="w-full py-3 bg-white/10 text-white/80 font-medium rounded-xl active:scale-95 transition-all"
                >
                    {t.reset}
                </button>
              </div>
            </div>
          </div>
        )}

        {state === GameState.LEVEL_UP && (
          <div className="absolute inset-0 bg-emerald-950/30 backdrop-blur-sm flex items-center justify-center fade-overlay-bg">
            <div className="bg-emerald-600/90 backdrop-blur-xl p-12 rounded-[2.5rem] border border-white/30 text-center pointer-events-auto shadow-2xl level-up-anim max-w-sm">
              <h2 className="text-5xl font-black mb-3 text-white tracking-tighter">{t.nextLevel}</h2>
              <p className="text-2xl font-bold text-emerald-100 mb-8">{t[level.nameKey as keyof typeof t]}</p>
              <div className="text-xs uppercase font-black tracking-[0.3em] text-white/70 animate-pulse">{t.nextDesc}</div>
            </div>
          </div>
        )}

        {state === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-red-950/50 backdrop-blur-md flex items-center justify-center fade-overlay-bg">
            <div className="bg-red-600/90 backdrop-blur-xl p-12 rounded-[2.5rem] border border-white/30 text-center pointer-events-auto shadow-2xl overlay-card max-w-sm" role="dialog" aria-labelledby="gameover-title">
              <h2 id="gameover-title" className="text-6xl font-black mb-4 italic tracking-tighter text-white uppercase">{t.gameOver}</h2>
              <div className="mb-2 text-3xl font-bold text-red-50">{t.score}: {score}</div>
              <div className="mb-10 text-yellow-300 font-black text-2xl uppercase tracking-wider">{t.highScore}: {highScore}</div>
              <button 
                onClick={() => handleAction(onReset, t.tryAgain)} 
                className="w-full py-5 bg-white text-red-600 font-black text-2xl rounded-2xl active:scale-95 transition-all shadow-2xl"
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="w-full text-center pointer-events-auto text-[11px] font-bold opacity-60 hover:opacity-100 transition-opacity pb-4 flex flex-wrap justify-center items-center gap-4">
        <span className="bg-black/20 px-3 py-1 rounded-full">(C) Noam Gold AI 2026</span>
        <div className="flex items-center gap-1">
            <i className="fas fa-paper-plane text-[9px]"></i>
            <a href="mailto:goldnoamai@gmail.com" className="hover:text-emerald-400 underline decoration-emerald-400/30 transition-colors">
                {t.feedback}: goldnoamai@gmail.com
            </a>
        </div>
      </footer>
    </div>
  );
};

export default GameUI;