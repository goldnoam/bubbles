
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, BubbleData, Level, BubbleType, Language, FontSize, GameSpeed } from './types';
import { LEVELS } from './constants';
import { audioService } from './services/audioService';
import Bubble from './components/Bubble';
import GameUI from './components/GameUI';

const HIGH_SCORE_KEY = 'fizzy_pop_highscore';
const COMBO_WINDOW = 1000; // 1 second to continue combo

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(GameState.START);
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lang, setLang] = useState<Language>('he');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(1.0);
  const [isDark, setIsDark] = useState(true);
  
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [combo, setCombo] = useState(0);
  const [isMuted, setIsMuted] = useState(audioService.getMuteStatus());
  const [isSlowed, setIsSlowed] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const currentLevel = LEVELS[levelIndex];
  const spawnTimerRef = useRef<number | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<BubbleData[]>([]);
  const lastPopTimeRef = useRef<number>(0);
  const comboTimeoutRef = useRef<number | null>(null);

  // Sync refs with state for the physics loop
  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  // Handle Combo Timeout
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

  // Language & Theme logic
  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.className = `${isDark ? 'dark' : ''} font-${fontSize}`;
  }, [isDark, fontSize]);

  // Physics Loop
  useEffect(() => {
    let animationFrameId: number;
    const updatePhysics = () => {
      if (state !== GameState.PLAYING) {
        animationFrameId = requestAnimationFrame(updatePhysics);
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      const nextBubbles = [...bubblesRef.current];

      for (let i = 0; i < nextBubbles.length; i++) {
        const b = nextBubbles[i];
        
        // Buoyancy / Upward force (affected by gameSpeed)
        const buoyancy = (isSlowed ? -0.1 : -0.3) * gameSpeed;
        b.vy += buoyancy;

        // Apply velocities (affected by gameSpeed)
        b.x += b.vx * gameSpeed;
        b.y += b.vy * gameSpeed;

        // Friction / Drag (affected by gameSpeed)
        b.vx *= (1 - (0.01 * gameSpeed));
        b.vy *= (1 - (0.01 * gameSpeed));

        // Wall collisions
        if (b.x < 0) { b.x = 0; b.vx *= -0.8; }
        if (b.x > width - b.size) { b.x = width - b.size; b.vx *= -0.8; }
        
        // Remove if off top or bottom
        if (b.y < -b.size * 2) {
          nextBubbles.splice(i, 1);
          i--;
          continue;
        }

        // Bubble-Bubble Collision
        for (let j = i + 1; j < nextBubbles.length; j++) {
          const b2 = nextBubbles[j];
          const dx = (b.x + b.size / 2) - (b2.x + b2.size / 2);
          const dy = (b.y + b.size / 2) - (b2.y + b2.size / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (b.size + b2.size) / 2;

          if (distance < minDistance) {
            // Collision resolution
            const angle = Math.atan2(dy, dx);
            const targetX = b2.x + b2.size / 2 + Math.cos(angle) * minDistance;
            const targetY = b2.y + b2.size / 2 + Math.sin(angle) * minDistance;
            const ax = (targetX - (b.x + b.size / 2)) * 0.1 * gameSpeed;
            const ay = (targetY - (b.y + b.size / 2)) * 0.1 * gameSpeed;

            b.vx += ax;
            b.vy += ay;
            b2.vx -= ax;
            b2.vy -= ay;
          }
        }
      }

      setBubbles(nextBubbles);
      
      // Visualization
      const intensity = audioService.getBeatIntensity();
      if (containerRef.current) {
        containerRef.current.style.setProperty('--beat-intensity', intensity.toString());
        containerRef.current.style.setProperty('--beat-scale', (1 + intensity * 0.05).toString());
        containerRef.current.style.setProperty('--beat-brightness', (1 + intensity * 0.3).toString());
      }

      animationFrameId = requestAnimationFrame(updatePhysics);
    };
    
    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, isSlowed, gameSpeed]);

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
    const size = 40 + Math.random() * 60; 
    const x = Math.random() * (window.innerWidth - size);
    const y = window.innerHeight + size;
    
    const rand = Math.random();
    let type = BubbleType.NORMAL;
    if (rand < 0.05) type = BubbleType.BOMB;
    else if (rand < 0.12) type = BubbleType.GOLDEN;
    else if (rand < 0.18) type = BubbleType.SLOW_MO;

    const baseSpeed = currentLevel.speedRange[0] + Math.random() * (currentLevel.speedRange[1] - currentLevel.speedRange[0]);
    // The visual/actual vertical velocity is influenced by gameSpeed in the physics loop.
    const speed = isSlowed ? baseSpeed * 0.5 : baseSpeed;
    
    const newBubble: BubbleData = {
      id, x, y, size, speed, color: currentLevel.bubbleColor, type,
      vx: (Math.random() - 0.5) * 4,
      vy: -speed,
      mass: size
    };
    setBubbles(prev => [...prev, newBubble]);
  }, [currentLevel, isSlowed]);

  const handleStart = () => { setState(GameState.PLAYING); audioService.playMusic(); };
  const handleResume = () => { setState(GameState.PLAYING); audioService.playMusic(); };
  const handleReset = () => {
    setScore(0); setLevelIndex(0); setBubbles([]); setIsSlowed(false); setIsShaking(false); setCombo(0);
    setState(GameState.START); audioService.pauseMusic();
    if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
  };

  const handleTogglePause = () => {
    if (state === GameState.PLAYING) { setState(GameState.PAUSED); audioService.pauseMusic(); }
  };

  const handlePop = useCallback((bubble: BubbleData) => {
    if (state !== GameState.PLAYING) return;
    
    audioService.playPop();
    const now = Date.now();
    const isCombo = now - lastPopTimeRef.current < COMBO_WINDOW;
    const currentCombo = isCombo ? combo + 1 : 1;
    setCombo(currentCombo);
    lastPopTimeRef.current = now;

    const multiplier = Math.min(1 + (currentCombo * 0.2), 5); // Max 5x multiplier
    let points = 0;

    switch (bubble.type) {
      case BubbleType.GOLDEN: points = 10; break;
      case BubbleType.BOMB:
        triggerShake();
        setBubbles(prev => { 
          const count = prev.length;
          setScore(s => s + Math.floor(count * 0.7 * multiplier) + 5); 
          return []; 
        });
        return;
      case BubbleType.SLOW_MO:
        setIsSlowed(true);
        if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
        slowTimeoutRef.current = window.setTimeout(() => setIsSlowed(false), 5000);
        points = 2;
        break;
      default: points = 1; break;
    }

    setScore(prev => prev + Math.floor(points * multiplier));
    
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    }, 300);
  }, [state, triggerShake, combo]);

  const toggleMute = () => {
    const newMuted = audioService.toggleMute();
    setIsMuted(newMuted);
    if (!newMuted && state === GameState.PLAYING) audioService.playMusic();
  };

  useEffect(() => {
    if (state === GameState.PLAYING) {
      // Spawn rate is inversely proportional to gameSpeed (higher speed = lower delay between spawns)
      const baseRate = isSlowed ? currentLevel.spawnRate * 2 : currentLevel.spawnRate;
      const rate = baseRate / gameSpeed;
      spawnTimerRef.current = window.setInterval(spawnBubble, rate);
    } else { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); }
    return () => { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); };
  }, [state, spawnBubble, currentLevel.spawnRate, isSlowed, gameSpeed]);

  useEffect(() => {
    if (score >= currentLevel.targetScore) {
      if (levelIndex < LEVELS.length - 1) {
        setState(GameState.LEVEL_UP);
        triggerShake(); setIsSlowed(false); setBubbles([]); setCombo(0);
        setTimeout(() => { setLevelIndex(prev => prev + 1); setState(GameState.PLAYING); }, 3000); 
      }
    }
  }, [score, currentLevel.targetScore, levelIndex, triggerShake]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-screen overflow-hidden transition-all duration-1000 ${currentLevel.bottleColor} ${isShaking ? 'screen-shake' : ''}`} 
      style={{ '--beat-intensity': '0', '--beat-scale': '1', '--beat-brightness': '1' } as any}
    >
      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 70%)`, transform: `scale(var(--beat-scale))`, filter: `brightness(var(--beat-brightness))` }}></div>
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none opacity-20" style={{ background: `linear-gradient(to top, white, transparent)`, transform: `scaleY(calc(0.5 + var(--beat-intensity) * 1.5))`, transformOrigin: 'bottom' }}></div>
      <div className={`absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.4),transparent)] ${isSlowed ? 'animate-pulse' : ''}`}></div>
      {isSlowed && <div className="absolute inset-0 pointer-events-none bg-blue-500/10 z-10 transition-opacity duration-1000"></div>}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] scale-[2] animate-pulse"></div>

      <div className="absolute inset-0 overflow-hidden">
        {bubbles.map(bubble => (
          <Bubble 
            key={bubble.id} 
            data={bubble} 
            onPop={handlePop} 
            isPaused={state === GameState.PAUSED} 
            combo={combo}
          />
        ))}
      </div>

      <GameUI 
        state={state} score={score} highScore={highScore} level={currentLevel} lang={lang} fontSize={fontSize} gameSpeed={gameSpeed}
        onStart={handleStart} onResume={handleResume} onReset={handleReset} onTogglePause={handleTogglePause}
        isMuted={isMuted} onToggleMute={toggleMute} onLanguageChange={setLang} onFontSizeChange={setFontSize} onGameSpeedChange={setGameSpeed}
        onToggleTheme={() => setIsDark(!isDark)}
        combo={combo}
      />

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
      <div className="absolute left-[8%] top-0 bottom-0 w-12 bg-white/5 blur-3xl pointer-events-none"></div>
      <div className="absolute right-[8%] top-0 bottom-0 w-16 bg-white/10 blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default App;
