
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, BubbleData, Level, BubbleType, Language, FontSize } from './types';
import { LEVELS } from './constants';
import { audioService } from './services/audioService';
import Bubble from './components/Bubble';
import GameUI from './components/GameUI';

const HIGH_SCORE_KEY = 'fizzy_pop_highscore';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(GameState.START);
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lang, setLang] = useState<Language>('he');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [isDark, setIsDark] = useState(true);
  
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [isMuted, setIsMuted] = useState(audioService.getMuteStatus());
  const [isSlowed, setIsSlowed] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const currentLevel = LEVELS[levelIndex];
  const spawnTimerRef = useRef<number | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state with DOM
  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.className = `${isDark ? 'dark' : ''} font-${fontSize}`;
  }, [isDark, fontSize]);

  useEffect(() => {
    let animationFrameId: number;
    const updateVisualization = () => {
      const intensity = audioService.getBeatIntensity();
      if (containerRef.current) {
        containerRef.current.style.setProperty('--beat-intensity', intensity.toString());
        containerRef.current.style.setProperty('--beat-scale', (1 + intensity * 0.05).toString());
        containerRef.current.style.setProperty('--beat-brightness', (1 + intensity * 0.3).toString());
      }
      animationFrameId = requestAnimationFrame(updateVisualization);
    };
    updateVisualization();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(HIGH_SCORE_KEY, score.toString());
    }
  }, [score, highScore]);

  const spawnBubble = useCallback(() => {
    const id = Math.random().toString(36).substring(2, 9);
    const size = 35 + Math.random() * 65; 
    const x = 8 + Math.random() * 84; 
    
    const rand = Math.random();
    let type = BubbleType.NORMAL;
    if (rand < 0.05) type = BubbleType.BOMB;
    else if (rand < 0.12) type = BubbleType.GOLDEN;
    else if (rand < 0.18) type = BubbleType.SLOW_MO;

    const baseSpeed = currentLevel.speedRange[0] + Math.random() * (currentLevel.speedRange[1] - currentLevel.speedRange[0]);
    const speed = isSlowed ? baseSpeed * 1.8 : baseSpeed;
    
    const newBubble: BubbleData = {
      id, x, size, speed, color: currentLevel.bubbleColor, type
    };
    setBubbles(prev => [...prev, newBubble]);
    setTimeout(() => setBubbles(prev => prev.filter(b => b.id !== id)), speed * 1000);
  }, [currentLevel, isSlowed]);

  const handleStart = () => { setState(GameState.PLAYING); audioService.playMusic(); };
  const handleResume = () => { setState(GameState.PLAYING); audioService.playMusic(); };
  const handleReset = () => {
    setScore(0); setLevelIndex(0); setBubbles([]); setIsSlowed(false); setIsShaking(false);
    setState(GameState.START); audioService.pauseMusic();
    if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
  };

  const handleTogglePause = () => {
    if (state === GameState.PLAYING) { setState(GameState.PAUSED); audioService.pauseMusic(); }
  };

  const handlePop = useCallback((bubble: BubbleData) => {
    if (state !== GameState.PLAYING) return;
    audioService.playPop();
    switch (bubble.type) {
      case BubbleType.GOLDEN: setScore(prev => prev + 10); break;
      case BubbleType.BOMB:
        triggerShake();
        setBubbles(prev => { setScore(s => s + Math.floor(prev.length * 0.7) + 5); return []; });
        break;
      case BubbleType.SLOW_MO:
        setIsSlowed(true);
        if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
        slowTimeoutRef.current = window.setTimeout(() => setIsSlowed(false), 5000);
        setScore(prev => prev + 2);
        break;
      default: setScore(prev => prev + 1); break;
    }
    setTimeout(() => setBubbles(prev => prev.filter(b => b.id !== bubble.id)), 400);
  }, [state, triggerShake]);

  const toggleMute = () => {
    const newMuted = audioService.toggleMute();
    setIsMuted(newMuted);
    if (!newMuted && state === GameState.PLAYING) audioService.playMusic();
  };

  useEffect(() => {
    if (state === GameState.PLAYING) {
      const rate = isSlowed ? currentLevel.spawnRate * 2.5 : currentLevel.spawnRate;
      spawnTimerRef.current = window.setInterval(spawnBubble, rate);
    } else { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); }
    return () => { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); };
  }, [state, spawnBubble, currentLevel.spawnRate, isSlowed]);

  useEffect(() => {
    if (score >= currentLevel.targetScore) {
      if (levelIndex < LEVELS.length - 1) {
        setState(GameState.LEVEL_UP);
        triggerShake(); setIsSlowed(false); setBubbles([]);
        setTimeout(() => { setLevelIndex(prev => prev + 1); setState(GameState.PLAYING); }, 3000); 
      }
    }
  }, [score, currentLevel.targetScore, levelIndex, triggerShake]);

  return (
    <div ref={containerRef} className={`relative w-full h-screen overflow-hidden transition-all duration-1000 ${currentLevel.bottleColor} ${isShaking ? 'screen-shake' : ''}`} style={{ '--beat-intensity': '0', '--beat-scale': '1', '--beat-brightness': '1' } as any}>
      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 70%)`, transform: `scale(var(--beat-scale))`, filter: `brightness(var(--beat-brightness))` }}></div>
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none opacity-20" style={{ background: `linear-gradient(to top, white, transparent)`, transform: `scaleY(calc(0.5 + var(--beat-intensity) * 1.5))`, transformOrigin: 'bottom' }}></div>
      <div className={`absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.4),transparent)] ${isSlowed ? 'animate-pulse' : ''}`}></div>
      {isSlowed && <div className="absolute inset-0 pointer-events-none bg-blue-500/10 z-10 transition-opacity duration-1000"></div>}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] scale-[2] animate-pulse"></div>

      <div className="absolute inset-0 overflow-hidden">
        {bubbles.map(bubble => <Bubble key={bubble.id} data={bubble} onPop={handlePop} isPaused={state === GameState.PAUSED} />)}
      </div>

      <GameUI 
        state={state} score={score} highScore={highScore} level={currentLevel} lang={lang} fontSize={fontSize}
        onStart={handleStart} onResume={handleResume} onReset={handleReset} onTogglePause={handleTogglePause}
        isMuted={isMuted} onToggleMute={toggleMute} onLanguageChange={setLang} onFontSizeChange={setFontSize}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
      <div className="absolute left-[8%] top-0 bottom-0 w-12 bg-white/5 blur-3xl pointer-events-none"></div>
      <div className="absolute right-[8%] top-0 bottom-0 w-16 bg-white/10 blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default App;
