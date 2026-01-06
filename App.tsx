
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, BubbleData, Level, BubbleType, Language, FontSize, GameSpeed } from './types';
import { LEVELS } from './constants';
import { audioService } from './services/audioService';
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
  // Default to dark theme as requested
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === 'true' : true;
  });
  
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [combo, setCombo] = useState(0);
  const [isMuted, setIsMuted] = useState(audioService.getMuteStatus());
  const [isSlowed, setIsSlowed] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isMultiplierActive, setIsMultiplierActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isMagnetActive, setIsMagnetActive] = useState(false);
  
  const currentLevel = LEVELS[levelIndex];
  const spawnTimerRef = useRef<number | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);
  const freezeTimeoutRef = useRef<number | null>(null);
  const magnetTimeoutRef = useRef<number | null>(null);
  // Fix: Defined multiplierTimeoutRef which was missing and causing errors
  const multiplierTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // High performance physics ref
  const bubblesRef = useRef<BubbleData[]>([]);
  
  const lastPopTimeRef = useRef<number>(0);
  const comboTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark.toString());
  }, [isDark]);

  useEffect(() => {
    if (combo > 0) {
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = window.setTimeout(() => {
        setCombo(0);
      }, COMBO_WINDOW);
    }
    return () => {
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    };
  }, [combo]);

  // Accessibility: Support multi-language and RTL
  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Accessibility & Theme: Dynamic font sizes and dark mode support
  useEffect(() => {
    document.documentElement.className = `${isDark ? 'dark' : ''} font-${fontSize}`;
  }, [isDark, fontSize]);

  // Cleanup effect for power-up timeouts
  useEffect(() => {
    return () => {
      if (slowTimeoutRef.current) window.clearTimeout(slowTimeoutRef.current);
      if (freezeTimeoutRef.current) window.clearTimeout(freezeTimeoutRef.current);
      if (magnetTimeoutRef.current) window.clearTimeout(magnetTimeoutRef.current);
      if (multiplierTimeoutRef.current) window.clearTimeout(multiplierTimeoutRef.current);
    };
  }, []);

  const spawnBubble = useCallback((forceType?: BubbleType, startY?: number) => {
    if (isFrozen && state === GameState.PLAYING) return;

    const id = Math.random().toString(36).substring(2, 9);
    const size = 60 + Math.random() * 50; 
    const x = Math.random() * (window.innerWidth - size);
    const y = startY !== undefined ? startY : window.innerHeight + size;
    
    const rand = Math.random();
    let type = forceType || BubbleType.NORMAL;
    if (!forceType && state === GameState.PLAYING) {
      if (rand < 0.06) type = BubbleType.BOMB;
      else if (rand < 0.13) type = BubbleType.GOLDEN;
      else if (rand < 0.18) type = BubbleType.SLOW_MO;
      else if (rand < 0.23) type = BubbleType.STICKY;
      else if (rand < 0.28) type = BubbleType.MAGNET;
      else if (rand < 0.33) type = BubbleType.MULTIPLIER;
      else if (rand < 0.38) type = BubbleType.FREEZE;
    }

    const baseSpeed = currentLevel.speedRange[0] + Math.random() * (currentLevel.speedRange[1] - currentLevel.speedRange[0]);
    const speed = isSlowed ? baseSpeed * 0.4 : baseSpeed;
    
    const newBubble: BubbleData = {
      id, x, y, size, speed, color: currentLevel.bubbleColor, type,
      vx: (Math.random() - 0.5) * 4,
      vy: -speed,
      rotation: Math.random() * 360,
      angularVelocity: (Math.random() - 0.5) * 10,
      mass: size
    };
    
    bubblesRef.current.push(newBubble);
  }, [currentLevel, isSlowed, isFrozen, state]);

  // Main Physics Engine
  useEffect(() => {
    let animationFrameId: number;
    
    const loop = () => {
      if (state === GameState.PLAYING || state === GameState.START) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const wallElasticity = 0.6;
        const friction = 0.998;
        
        // Upward buoyancy
        const gravityEffect = (isSlowed ? -0.04 : (isFrozen ? 0 : -0.15)) * (state === GameState.START ? 0.3 : gameSpeed);

        for (let i = 0; i < bubblesRef.current.length; i++) {
          const b = bubblesRef.current[i];
          if (!isFrozen) {
            b.vy += gravityEffect;
            
            // Interaction Logic
            for (let j = 0; j < bubblesRef.current.length; j++) {
              if (i === j) continue;
              const other = bubblesRef.current[j];
              
              // MAGNET LOGIC: If 'other' is a magnet bubble, it pulls 'b'
              if (other.type === BubbleType.MAGNET) {
                const magRange = 450;
                const dx = (other.x + other.size / 2) - (b.x + b.size / 2);
                const dy = (other.y + other.size / 2) - (b.y + b.size / 2);
                const distSq = dx * dx + dy * dy;

                if (distSq < magRange * magRange) {
                  const dist = Math.sqrt(distSq);
                  if (dist > 5) {
                    const pullForce = (magRange - dist) / 3000;
                    b.vx += (dx / dist) * pullForce * gameSpeed;
                    b.vy += (dy / dist) * pullForce * gameSpeed;
                  }
                }
              }
            }

            const step = (state === GameState.START ? 0.4 : gameSpeed);
            b.x += b.vx * step;
            b.y += b.vy * step;
            b.rotation += b.angularVelocity * step;
            b.vx *= friction;
            b.vy *= friction;
          }

          // Boundary Checks
          if (b.x < 0) { b.x = 0; b.vx *= -wallElasticity; }
          if (b.x > width - b.size) { b.x = width - b.size; b.vx *= -wallElasticity; }
          
          // Cleanup
          if (b.y < -b.size * 2) {
            if (state === GameState.START) {
              b.y = height + b.size;
              b.x = Math.random() * (width - b.size);
            } else {
              bubblesRef.current.splice(i, 1);
              i--;
              continue;
            }
          }
        }

        // Sync with React State
        setBubbles([...bubblesRef.current]);

        const intensity = audioService.getBeatIntensity();
        if (containerRef.current) {
          containerRef.current.style.setProperty('--beat-scale', (1 + intensity * 0.1).toString());
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, isSlowed, isFrozen, gameSpeed]);

  // Spawner Logic
  useEffect(() => {
    if (state === GameState.PLAYING && !isFrozen) {
      const rate = (isSlowed ? currentLevel.spawnRate * 2.0 : currentLevel.spawnRate) / gameSpeed;
      spawnTimerRef.current = window.setInterval(() => spawnBubble(), rate);
    } else {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    }
    return () => { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); };
  }, [state, spawnBubble, currentLevel.spawnRate, isSlowed, gameSpeed, isFrozen]);

  // Ambient Start Bubbles
  useEffect(() => {
    if (state === GameState.START && bubblesRef.current.length < 10) {
      for (let i = 0; i < 10; i++) spawnBubble(BubbleType.NORMAL, Math.random() * window.innerHeight);
    }
  }, [state, spawnBubble]);

  const handleStart = () => {
    bubblesRef.current = [];
    setBubbles([]);
    setState(GameState.PLAYING);
    audioService.playMusic();
    // Immediate splash of bubbles
    for (let i = 0; i < 6; i++) spawnBubble(BubbleType.NORMAL, window.innerHeight * (0.5 + Math.random() * 0.4));
  };

  const handlePop = useCallback((bubble: BubbleData) => {
    if (state !== GameState.PLAYING) return;
    audioService.playPop();
    const now = Date.now();
    const isCombo = now - lastPopTimeRef.current < COMBO_WINDOW;
    const currentCombo = isCombo ? combo + 1 : 1;
    setCombo(currentCombo);
    lastPopTimeRef.current = now;

    let multiplier = Math.min(1 + (currentCombo * 0.25), 5);
    if (isMultiplierActive) multiplier *= 2;
    
    let points = 5;
    if (bubble.type === BubbleType.GOLDEN) points = 100;
    else if (bubble.type === BubbleType.BOMB) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      const count = bubblesRef.current.length;
      bubblesRef.current = [];
      setScore(s => s + count * 20);
      return;
    } else if (bubble.type === BubbleType.SLOW_MO) {
      setIsSlowed(true);
      if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
      slowTimeoutRef.current = window.setTimeout(() => setIsSlowed(false), 7000);
      points = 20;
    } else if (bubble.type === BubbleType.FREEZE) {
      setIsFrozen(true);
      if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
      freezeTimeoutRef.current = window.setTimeout(() => setIsFrozen(false), 3000);
      points = 20;
    } else if (bubble.type === BubbleType.MAGNET) {
      // Bonus for popping the magnet itself
      points = 50;
    } else if (bubble.type === BubbleType.MULTIPLIER) {
      setIsMultiplierActive(true);
      // Fix: multiplierTimeoutRef is now defined and properly cleared
      if (multiplierTimeoutRef.current) clearTimeout(multiplierTimeoutRef.current);
      multiplierTimeoutRef.current = window.setTimeout(() => setIsMultiplierActive(false), 10000);
      points = 20;
    }

    setScore(s => s + Math.floor(points * multiplier));
    bubblesRef.current = bubblesRef.current.filter(b => b.id !== bubble.id);
    setBubbles([...bubblesRef.current]);
  }, [state, combo, isMultiplierActive]);

  const onReset = () => {
    bubblesRef.current = [];
    setBubbles([]);
    setScore(0);
    setLevelIndex(0);
    setState(GameState.START);
    setIsSlowed(false);
    setIsFrozen(false);
    setIsMultiplierActive(false);
    audioService.pauseMusic();
  };

  useEffect(() => {
    if (score >= currentLevel.targetScore && state === GameState.PLAYING) {
      if (levelIndex < LEVELS.length - 1) {
        setState(GameState.LEVEL_UP);
        setTimeout(() => {
          setLevelIndex(prev => prev + 1);
          setState(GameState.PLAYING);
        }, 2500);
      }
    }
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(HIGH_SCORE_KEY, score.toString());
    }
  }, [score, currentLevel.targetScore, levelIndex, state, highScore]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-screen overflow-hidden transition-all duration-1000 ${currentLevel.bottleColor} ${isShaking ? 'screen-shake' : ''}`}
      role="main"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/5 pointer-events-none"></div>
      
      {isSlowed && <div className="absolute inset-0 bg-blue-500/10 pointer-events-none z-10 animate-pulse"></div>}
      {isFrozen && <div className="absolute inset-0 bg-cyan-100/10 backdrop-blur-[2px] pointer-events-none z-10"></div>}
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {bubbles.map(b => (
          <Bubble 
            key={b.id} 
            data={b} 
            onPop={handlePop} 
            isPaused={state === GameState.PAUSED} 
            isGlobalFrozen={isFrozen} 
            combo={combo} 
          />
        ))}
      </div>
      
      <GameUI 
        state={state} score={score} highScore={highScore} level={currentLevel} lang={lang} fontSize={fontSize} gameSpeed={gameSpeed}
        onStart={handleStart} onResume={() => setState(GameState.PLAYING)} onReset={onReset} onTogglePause={() => setState(GameState.PAUSED)}
        isMuted={isMuted} onToggleMute={() => { const m = audioService.toggleMute(); setIsMuted(m); }}
        onLanguageChange={setLang} onFontSizeChange={setFontSize} onGameSpeedChange={setGameSpeed}
        onToggleTheme={() => setIsDark(!isDark)} isDark={isDark} combo={combo}
      />
    </div>
  );
};

export default App;
