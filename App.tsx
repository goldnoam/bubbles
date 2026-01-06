
// Add comment above each fix
// Setting dark theme as default and applying font size/theme classes for accessibility
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, BubbleData, Level, BubbleType, Language, FontSize, GameSpeed } from './types';
import { LEVELS } from './constants';
import { audioService } from './audioService';
import Bubble from './components/Bubble';
import GameUI from './components/GameUI';

const HIGH_SCORE_KEY = 'fizzy_pop_highscore';
const THEME_KEY = 'fizzy_pop_theme';
const COMBO_WINDOW = 1200;

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(GameState.START);
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lang, setLang] = useState<Language>('he');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(1.0);
  
  // Set dark theme as default
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === null ? true : saved === 'true';
  });
  const [highScore, setHighScore] = useState<number>(() => parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10));

  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [combo, setCombo] = useState(0);
  const [isMuted, setIsMuted] = useState(audioService.getMuteStatus());
  const [isSlowed, setIsSlowed] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isMultiplierActive, setIsMultiplierActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const currentLevel = LEVELS[levelIndex];
  const spawnTimerRef = useRef<number | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);
  const freezeTimeoutRef = useRef<number | null>(null);
  const multiplierTimeoutRef = useRef<number | null>(null);
  const bubblesRef = useRef<BubbleData[]>([]);
  const lastPopTimeRef = useRef<number>(0);

  useEffect(() => { localStorage.setItem(THEME_KEY, isDark.toString()); }, [isDark]);

  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    // Applying accessibility classes for font size and dark mode
    document.body.className = `${isDark ? 'dark' : ''} size-${fontSize}`;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [lang, isDark, fontSize]);

  const spawnBubble = useCallback((forceType?: BubbleType, initialY?: number) => {
    const size = 60 + Math.random() * 60;
    const id = Math.random().toString(36).substring(2, 9);
    const x = Math.random() * (window.innerWidth - size);
    const y = initialY !== undefined ? initialY : window.innerHeight + size;

    let type = forceType || BubbleType.NORMAL;
    const rand = Math.random();
    if (!forceType && state === GameState.PLAYING) {
      if (rand < 0.05) type = BubbleType.BOMB;
      else if (rand < 0.10) type = BubbleType.GOLDEN;
      else if (rand < 0.15) type = BubbleType.SLOW_MO;
      else if (rand < 0.20) type = BubbleType.MAGNET;
      else if (rand < 0.25) type = BubbleType.MULTIPLIER;
      else if (rand < 0.30) type = BubbleType.FREEZE;
    }

    const baseSpeed = currentLevel.speedRange[0] + Math.random() * (currentLevel.speedRange[1] - currentLevel.speedRange[0]);
    const newBubble: BubbleData = {
      id, x, y, size, speed: baseSpeed, color: currentLevel.bubbleColor, type,
      vx: (Math.random() - 0.5) * 3,
      vy: -baseSpeed,
      rotation: Math.random() * 360,
      angularVelocity: (Math.random() - 0.5) * 5,
      mass: size
    };
    bubblesRef.current.push(newBubble);
  }, [currentLevel, state]);

  // Main Physics Loop
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const physicsStep = gameSpeed;

      if (state === GameState.PLAYING || state === GameState.START) {
        const buoyancy = (isSlowed ? -0.05 : (isFrozen ? 0 : -0.15)) * physicsStep;

        for (let i = 0; i < bubblesRef.current.length; i++) {
          const b = bubblesRef.current[i];
          if (!isFrozen) {
            // Apply magnet pull
            bubblesRef.current.forEach(other => {
              if (other.type === BubbleType.MAGNET && other.id !== b.id) {
                const dx = (other.x + other.size / 2) - (b.x + b.size / 2);
                const dy = (other.y + other.size / 2) - (b.y + b.size / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 450 && dist > 10) {
                  const force = (450 - dist) / 5000;
                  b.vx += (dx / dist) * force * physicsStep;
                  b.vy += (dy / dist) * force * physicsStep;
                }
              }
            });

            b.vy += buoyancy;
            b.x += b.vx * physicsStep;
            b.y += b.vy * physicsStep;
            b.rotation += b.angularVelocity * physicsStep;

            if (b.x < 0) { b.x = 0; b.vx *= -0.6; }
            if (b.x > w - b.size) { b.x = w - b.size; b.vx *= -0.6; }
          }

          if (b.y < -b.size * 2) {
            if (state === GameState.START) {
              b.y = h + b.size;
              b.x = Math.random() * (w - b.size);
              b.vy = -b.speed;
            } else {
              bubblesRef.current.splice(i, 1);
              i--;
            }
          }
        }
        setBubbles([...bubblesRef.current]);
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [state, isSlowed, isFrozen, gameSpeed]);

  useEffect(() => {
    if (state === GameState.PLAYING && !isFrozen) {
      const interval = (isSlowed ? currentLevel.spawnRate * 2.5 : currentLevel.spawnRate) / gameSpeed;
      spawnTimerRef.current = window.setInterval(() => spawnBubble(), interval);
    } else if (state === GameState.START && bubblesRef.current.length < 12) {
      for (let i = 0; i < 12; i++) spawnBubble(BubbleType.NORMAL, Math.random() * window.innerHeight);
    }
    return () => { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); };
  }, [state, isFrozen, isSlowed, gameSpeed, currentLevel, spawnBubble]);

  const handleStart = () => {
    bubblesRef.current = [];
    setBubbles([]);
    setState(GameState.PLAYING);
    audioService.playMusic();
    for (let i = 0; i < 5; i++) spawnBubble(BubbleType.NORMAL, window.innerHeight * 0.8);
  };

  const handlePop = useCallback((bubble: BubbleData) => {
    if (state !== GameState.PLAYING) return;
    audioService.playPop();
    const now = Date.now();
    const isCombo = now - lastPopTimeRef.current < COMBO_WINDOW;
    const currentCombo = isCombo ? combo + 1 : 1;
    setCombo(currentCombo);
    lastPopTimeRef.current = now;

    let multiplier = Math.min(1 + (currentCombo * 0.2), 5) * (isMultiplierActive ? 2 : 1);
    let pts = 10;

    if (bubble.type === BubbleType.BOMB) {
      setIsShaking(true); setTimeout(() => setIsShaking(false), 500);
      pts = bubblesRef.current.length * 15;
      bubblesRef.current = [];
    } else if (bubble.type === BubbleType.GOLDEN) pts = 100;
    else if (bubble.type === BubbleType.SLOW_MO) {
      setIsSlowed(true);
      if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
      slowTimeoutRef.current = window.setTimeout(() => setIsSlowed(false), 8000);
    } else if (bubble.type === BubbleType.FREEZE) {
      setIsFrozen(true);
      if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
      freezeTimeoutRef.current = window.setTimeout(() => setIsFrozen(false), 3500);
    } else if (bubble.type === BubbleType.MULTIPLIER) {
      setIsMultiplierActive(true);
      if (multiplierTimeoutRef.current) clearTimeout(multiplierTimeoutRef.current);
      multiplierTimeoutRef.current = window.setTimeout(() => setIsMultiplierActive(false), 12000);
    }

    setScore(s => s + Math.floor(pts * multiplier));
    bubblesRef.current = bubblesRef.current.filter(b => b.id !== bubble.id);
    setBubbles([...bubblesRef.current]);
  }, [state, combo, isMultiplierActive]);

  const onReset = () => {
    bubblesRef.current = []; setBubbles([]); setScore(0); setLevelIndex(0);
    setState(GameState.START); setIsSlowed(false); setIsFrozen(false); setIsMultiplierActive(false);
    audioService.pauseMusic();
  };

  useEffect(() => {
    if (score >= currentLevel.targetScore && state === GameState.PLAYING) {
      if (levelIndex < LEVELS.length - 1) {
        setState(GameState.LEVEL_UP);
        setTimeout(() => { setLevelIndex(l => l + 1); setState(GameState.PLAYING); }, 2000);
      }
    }
    if (score > highScore) { setHighScore(score); localStorage.setItem(HIGH_SCORE_KEY, score.toString()); }
  }, [score, currentLevel, levelIndex, state, highScore]);

  return (
    <div className={`relative w-full h-screen overflow-hidden ${currentLevel.bottleColor} ${isShaking ? 'screen-shake' : ''}`} role="main">
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10 pointer-events-none"></div>
      {isSlowed && <div className="absolute inset-0 bg-blue-500/15 animate-pulse pointer-events-none z-10"></div>}
      {isFrozen && <div className="absolute inset-0 bg-cyan-200/10 backdrop-blur-[2px] pointer-events-none z-10"></div>}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {bubbles.map(b => <Bubble key={b.id} data={b} onPop={handlePop} isPaused={state === GameState.PAUSED} isGlobalFrozen={isFrozen} combo={combo} />)}
      </div>
      <GameUI 
        state={state} score={score} highScore={highScore} level={currentLevel} lang={lang} fontSize={fontSize} gameSpeed={gameSpeed}
        onStart={handleStart} onResume={() => setState(GameState.PLAYING)} onReset={onReset} onTogglePause={() => setState(GameState.PAUSED)}
        isMuted={isMuted} onToggleMute={() => setIsMuted(audioService.toggleMute())}
        onLanguageChange={setLang} onFontSizeChange={setFontSize} onGameSpeedChange={setGameSpeed}
        onToggleTheme={() => setIsDark(!isDark)} isDark={isDark} combo={combo} isMultiplierActive={isMultiplierActive}
      />
    </div>
  );
};

export default App;
