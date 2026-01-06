
import React, { useState, useEffect } from 'react';
import { GameState, Level, Language, FontSize, GameSpeed } from '../types';
import { I18N } from '../constants';
import { audioService } from '../services/audioService';

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
  const [showSettings, setShowSettings] = useState(false);
  
  const [volumes, setVolumes] = useState(audioService.getVolumes());
  const [currentTrack, setCurrentTrack] = useState(audioService.getMusicTrack());

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

  // Accessibility: Native Browser Text-to-Speech for UI interactions
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
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

  // Export search/stats functionality
  const handleExport = () => {
    const data = `
Fizzy Pop Master - Game Stats
----------------------------
Score: ${score}
High Score: ${highScore}
Level: ${level.id} (${t[level.nameKey as keyof typeof t] || level.nameKey})
Speed: ${gameSpeed}x
Language: ${lang}
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

  // Drag and drop text support for search box
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text");
    if (data) {
        setSearchValue(data);
        speak(`Imported: ${data}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleVolumeChange = (type: 'master' | 'music' | 'sfx', val: number) => {
    if (type === 'master') audioService.setMasterVolume(val);
    else if (type === 'music') audioService.setMusicVolume(val);
    else if (type === 'sfx') audioService.setSfxVolume(val);
    setVolumes(audioService.getVolumes());
  };

  const handleTrackChange = (track: string) => {
    audioService.setMusicTrack(track);
    setCurrentTrack(track);
    speak(track === 'none' ? t.trackNone : t[`track${track.charAt(0).toUpperCase() + track.slice(1)}` as keyof typeof t] || track);
  };

  const renderVolumeControls = () => (
    <div className="flex flex-col gap-4 mt-6 bg-white/5 dark:bg-black/20 p-5 rounded-2xl border border-white/5">
      <div className="text-xs uppercase font-black tracking-widest text-emerald-400 mb-1">{t.volume}</div>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-bold opacity-70 uppercase">
            <span>{t.master}</span>
            <span>{Math.round(volumes.master * 100)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.01" value={volumes.master} 
            onChange={(e) => handleVolumeChange('master', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            aria-label={t.master}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-bold opacity-70 uppercase">
            <span>{t.music}</span>
            <span>{Math.round(volumes.music * 100)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.01" value={volumes.music} 
            onChange={(e) => handleVolumeChange('music', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-label={t.music}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-bold opacity-70 uppercase">
            <span>{t.sfx}</span>
            <span>{Math.round(volumes.sfx * 100)}%</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.01" value={volumes.sfx} 
            onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            aria-label={t.sfx}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <label className="text-[10px] font-bold opacity-70 uppercase mb-1">{t.musicTrack}</label>
        <select 
          className="bg-white/10 dark:bg-black/40 rounded-lg px-3 py-2 text-xs outline-none border border-white/10 text-white cursor-pointer hover:bg-white/20 transition-colors"
          value={currentTrack}
          onChange={(e) => handleTrackChange(e.target.value)}
          aria-label={t.musicTrack}
        >
          <option value="popcorn" className="bg-slate-900">{t.trackPopcorn}</option>
          <option value="techno" className="bg-slate-900">{t.trackTechno}</option>
          <option value="retro" className="bg-slate-900">{t.trackRetro}</option>
          <option value="none" className="bg-slate-900">{t.trackNone}</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-between z-50 text-white p-6 overflow-hidden`}>
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

          <div className="flex flex-col items-end gap-2">
            <div className="bg-black/40 dark:bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-right-custom shadow-lg min-w-[140px]" role="status">
              <div className="text-[10px] opacity-70 uppercase tracking-widest">{t.level}: {t[level.nameKey as keyof typeof t] || level.nameKey}</div>
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
          <div className="bg-white/10 dark:bg-black/80 backdrop-blur-xl p-8 rounded-3xl border border-white/20 text-center max-w-md w-full pointer-events-auto shadow-2xl scale-in overflow-y-auto max-h-[90vh]" role="dialog" aria-labelledby="start-title">
            <h1 id="start-title" className="text-6xl font-black mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-blue-500">{t.title}</h1>
            <div className="mb-4 text-yellow-500 font-bold text-lg uppercase tracking-widest">{t.highScore}: {highScore}</div>
            
            <button 
              onClick={() => handleAction(onStart, t.start)}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-2xl rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/30 mb-6"
            >
              {t.start}
            </button>

            <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
              <div className="flex flex-wrap justify-center gap-3">
                <select 
                  className="bg-white/20 dark:bg-white/10 rounded-lg px-3 py-2 text-sm outline-none border border-white/20 text-white cursor-pointer hover:bg-white/30 transition-colors" 
                  value={lang} 
                  onChange={(e) => { onLanguageChange(e.target.value as Language); speak("Language Changed"); }}
                  aria-label="Language Selector"
                >
                  {Object.keys(I18N).map(l => <option key={l} value={l} className="bg-slate-900">{I18N[l as keyof typeof I18N].lang}</option>)}
                </select>
                
                <div className="flex bg-white/20 dark:bg-white/10 rounded-lg border border-white/20 p-1">
                  {(['small', 'medium', 'large'] as FontSize[]).map(s => (
                    <button 
                        key={s} 
                        onClick={() => { onFontSizeChange(s); speak(`Font size ${s}`); }} 
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${fontSize === s ? 'bg-emerald-500 text-white shadow-md' : 'hover:bg-white/10 text-white/70'}`} 
                        aria-label={`Set font size to ${s}`}
                    >
                      {s === 'small' ? 'A' : s === 'medium' ? 'A+' : 'A++'}
                    </button>
                  ))}
                </div>

                <button 
                    onClick={() => { onToggleTheme(); speak("Theme Toggled"); }} 
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border border-white/20 hover:bg-white/30 transition-all ${isDark ? 'bg-white/5 text-blue-300' : 'bg-white/20 text-yellow-400'}`} 
                    aria-label="Toggle Theme"
                >
                  <i className={`fas ${isDark ? 'fa-moon' : 'fa-sun'} text-lg`}></i>
                </button>

                <button 
                    onClick={() => { setShowSettings(!showSettings); speak(t.settings); }} 
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border border-white/20 hover:bg-white/30 transition-all ${showSettings ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'}`} 
                    aria-label={t.settings}
                    aria-expanded={showSettings}
                >
                  <i className="fas fa-cog text-lg"></i>
                </button>
              </div>

              {showSettings && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  {renderVolumeControls()}
                  
                  <div className="flex flex-col items-center gap-2 w-full max-w-xs mx-auto mt-6">
                    <div className="flex justify-between w-full text-[10px] uppercase font-bold tracking-widest opacity-60 px-1">
                      <span>{t.gameSpeed}</span>
                      <span>{gameSpeed.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.1" value={gameSpeed} 
                      onChange={(e) => onGameSpeedChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      aria-label={t.gameSpeed}
                    />
                  </div>

                  {/* Autocomplete and Drag-and-Drop Search Box */}
                  <div className="relative mt-6 text-left-custom" onDrop={handleDrop} onDragOver={handleDragOver}>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          list="flavor-list"
                          placeholder={t.searchPlaceholder}
                          className="w-full bg-white/20 dark:bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-xs text-white transition-colors"
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          aria-label={t.searchPlaceholder}
                        />
                        <datalist id="flavor-list">
                          {flavors.map(f => <option key={f} value={f} />)}
                        </datalist>
                        {searchValue && (
                          <button 
                              onClick={() => { setSearchValue(""); speak(t.clear); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                              aria-label={t.clear}
                          >
                            <i className="fas fa-times-circle"></i>
                          </button>
                        )}
                      </div>
                      <button 
                          onClick={handleExport} 
                          className="w-10 h-10 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center hover:bg-blue-500/20 border border-white/10 transition-colors" 
                          title={t.export}
                          aria-label={t.export}
                      >
                        <i className="fas fa-file-export text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {state === GameState.PAUSED && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center">
            <div className="bg-slate-900/80 backdrop-blur-2xl p-8 rounded-3xl border border-white/20 text-center max-w-sm w-full pointer-events-auto shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-4xl font-black mb-6 tracking-tighter">{t.pause}</h2>
              <div className="flex flex-col gap-4">
                <button onClick={() => handleAction(onResume, t.resume)} className="w-full py-4 bg-emerald-500 text-white font-bold text-xl rounded-2xl active:scale-95 transition-all shadow-lg">{t.resume}</button>
                
                <button 
                  onClick={() => setShowSettings(!showSettings)} 
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${showSettings ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/10'}`}
                  aria-expanded={showSettings}
                >
                  <i className="fas fa-sliders-h"></i>
                  {t.settings}
                </button>

                {showSettings && (
                  <div className="text-left-custom">
                     {renderVolumeControls()}
                  </div>
                )}

                <button onClick={() => handleAction(onReset, t.reset)} className="w-full py-3 bg-white/5 text-white/60 text-sm font-medium rounded-xl active:scale-95 transition-all hover:bg-red-500/20 hover:text-red-300">{t.reset}</button>
              </div>
            </div>
          </div>
        )}

        {state === GameState.LEVEL_UP && (
          <div className="absolute inset-0 bg-emerald-950/30 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-emerald-600/90 backdrop-blur-xl p-12 rounded-[2.5rem] border border-white/30 text-center pointer-events-auto shadow-2xl max-w-sm">
              <h2 className="text-5xl font-black mb-3 text-white tracking-tighter">{t.nextLevel}</h2>
              <p className="text-2xl font-bold text-emerald-100 mb-8">{t[level.nameKey as keyof typeof t] || level.nameKey}</p>
              <div className="text-xs uppercase font-black tracking-[0.3em] text-white/70 animate-pulse">{t.nextDesc}</div>
            </div>
          </div>
        )}

        {state === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-red-950/50 backdrop-blur-md flex items-center justify-center">
            <div className="bg-red-600/90 backdrop-blur-xl p-12 rounded-[2.5rem] border border-white/30 text-center pointer-events-auto shadow-2xl max-w-sm">
              <h2 className="text-6xl font-black mb-4 italic tracking-tighter text-white uppercase">{t.gameOver}</h2>
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
            <span className="text-xs font-medium ml-1">{t.feedback}:</span>
            <a href="mailto:goldnoamai@gmail.com" className="hover:text-emerald-400 underline decoration-emerald-400/30 transition-colors">
                 goldnoamai@gmail.com
            </a>
        </div>
      </footer>
    </div>
  );
};

export default GameUI;
