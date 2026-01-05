
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, BubbleData, Level, BubbleType, Language, FontSize, GameSpeed } from './types';
import { LEVELS } from './constants';
import { audioService } from './services/audioService';
import Bubble from './components/Bubble';
import GameUI from './components/GameUI';

const HIGH_SCORE_KEY = 'fizzy_pop_highscore';
const THEME_KEY = 'fizzy_pop_theme';
const COMBO_WINDOW = 1000; 

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(GameState.START);
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lang, setLang] = useState<Language>('he');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(1.0);
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
  const [isMultiplierActive, setIsMultiplierActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isDistorted, setIsDistorted] = useState(false);
  
  const currentLevel = LEVELS[levelIndex];
  const spawnTimerRef = useRef<number | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);
  const multiplierTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<BubbleData[]>([]);
  const lastPopTimeRef = useRef<number>(0);
  const comboTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark.toString());
  }, [isDark]);

  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

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

  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.className = `${isDark ? 'dark' : ''} font-${fontSize}`;
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDark, fontSize]);

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
      const elasticity = 0.7; // How much energy is kept in bounce
      const friction = 0.98; // Tangential friction

      for (let i = 0; i < nextBubbles.length; i++) {
        const b = nextBubbles[i];
        
        // Buoyancy / Upward force
        const buoyancy = (isSlowed ? -0.1 : -0.3) * gameSpeed;
        b.vy += buoyancy;

        // Apply Sticky Effect: Bubbles near a STICKY bubble get dragged/slowed
        for (let j = 0; j < nextBubbles.length; j++) {
            if (i === j) continue;
            const b2 = nextBubbles[j];
            if (b2.type === BubbleType.STICKY) {
                const dx = b.x - b2.x;
                const dy = b.y - b2.y;
                const distSq = dx*dx + dy*dy;
                const range = 150;
                if (distSq < range * range) {
                    const drag = 0.05 * gameSpeed;
                    b.vx *= (1 - drag);
                    b.vy *= (1 - drag);
                }
            }
        }

        // Apply velocities
        b.x += b.vx * gameSpeed;
        b.y += b.vy * gameSpeed;

        // Friction / Drag (Air/Liquid resistance)
        b.vx *= (1 - (0.005 * gameSpeed));
        b.vy *= (1 - (0.005 * gameSpeed));

        // Wall collisions
        if (b.x < 0) { b.x = 0; b.vx *= -elasticity; }
        if (b.x > width - b.size) { b.x = width - b.size; b.vx *= -elasticity; }
        
        // Remove if off top
        if (b.y < -b.size * 2) {
          nextBubbles.splice(i, 1);
          i--;
          continue;
        }

        // Bubble-Bubble Collision (Physics Improved)
        for (let j = i + 1; j < nextBubbles.length; j++) {
          const b2 = nextBubbles[j];
          const dx = (b.x + b.size / 2) - (b2.x + b2.size / 2);
          const dy = (b.y + b.size / 2) - (b2.y + b2.size / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (b.size + b2.size) / 2;

          if (distance < minDistance) {
            // Collision normal
            const nx = dx / distance;
            const ny = dy / distance;

            // Relative velocity
            const rvx = b.vx - b2.vx;
            const rvy = b.vy - b2.vy;

            // Velocity along normal
            const velAlongNormal = rvx * nx + rvy * ny;

            // Do not resolve if velocities are separating
            if (velAlongNormal > 0) continue;

            // Restitution
            const j_impulse = -(1 + elasticity) * velAlongNormal;
            const invMass1 = 1 / b.mass;
            const invMass2 = 1 / b2.mass;
            const impulse = j_impulse / (invMass1 + invMass2);

            // Apply impulse
            const impulseX = impulse * nx;
            const impulseY = impulse * ny;

            b.vx += invMass1 * impulseX;
            b.vy += invMass1 * impulseY;
            b2.vx -= invMass2 * impulseX;
            b2.vy -= invMass2 * impulseY;

            // Positional correction to prevent sticking
            const percent = 0.2; // penetration percentage to correct
            const slop = 0.01; // penetration allowance
            const penetration = minDistance - distance;
            const correction = Math.max(penetration - slop, 0) / (invMass1 + invMass2) * percent;
            const cx = correction * nx;
            const cy = correction * ny;
            b.x += invMass1 * cx;
            b.y += invMass1 * cy;
            b2.x -= invMass2 * cx;
            b2.y -= invMass2 * cy;
          }
        }
      }

      setBubbles(nextBubbles);
      
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

  const triggerBombEffect = useCallback(() => {
    setIsShaking(true);
    setIsDistorted(true);
    setTimeout(() => {
      setIsShaking(false);
      setIsDistorted(false);
    }, 600);
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
    if (rand < 0.04) type = BubbleType.BOMB;
    else if (rand < 0.10) type = BubbleType.GOLDEN;
    else if (rand < 0.14) type = BubbleType.SLOW_MO;
    else if (rand < 0.18) type = BubbleType.STICKY;
    else if (rand < 0.22) type = BubbleType.MULTIPLIER;

    const baseSpeed = currentLevel.speedRange[0] + Math.random() * (currentLevel.speedRange[1] - currentLevel.speedRange[0]);
    const speed = isSlowed ? baseSpeed * 0.5 : baseSpeed;
    
    const newBubble: BubbleData = {
      id, x, y, size, speed, color: currentLevel.bubbleColor, type,
      vx: (Math.random() - 0.5) * 4,
      vy: -speed,
      mass: size // Mass proportional to size
    };
    setBubbles(prev => [...prev, newBubble]);
  }, [currentLevel, isSlowed]);

  const handleStart = () => { setState(GameState.PLAYING); audioService.playMusic(); };
  const handleResume = () => { setState(GameState.PLAYING); audioService.playMusic(); };
  const handleReset = () => {
    setScore(0); setLevelIndex(0); setBubbles([]); setIsSlowed(false); setIsMultiplierActive(false); setIsShaking(false); setIsDistorted(false); setCombo(0);
    setState(GameState.START); audioService.pauseMusic();
    if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
    if (multiplierTimeoutRef.current) clearTimeout(multiplierTimeoutRef.current);
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

    let multiplier = Math.min(1 + (currentCombo * 0.2), 5);
    if (isMultiplierActive) multiplier *= 2;
    
    let points = 0;

    switch (bubble.type) {
      case BubbleType.GOLDEN: points = 10; break;
      case BubbleType.BOMB:
        triggerBombEffect();
        setBubbles(prev => { 
          const count = prev.length;
          setScore(s => s + Math.floor(count * 0.7 * multiplier) + 15); 
          return []; 
        });
        return;
      case BubbleType.SLOW_MO:
        setIsSlowed(true);
        if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
        slowTimeoutRef.current = window.setTimeout(() => setIsSlowed(false), 5000);
        points = 2;
        break;
      case BubbleType.STICKY:
        points = 5;
        break;
      case BubbleType.MULTIPLIER:
        setIsMultiplierActive(true);
        if (multiplierTimeoutRef.current) clearTimeout(multiplierTimeoutRef.current);
        multiplierTimeoutRef.current = window.setTimeout(() => setIsMultiplierActive(false), 8000);
        points = 3;
        break;
      default: points = 1; break;
    }

    setScore(prev => prev + Math.floor(points * multiplier));
    
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));
    }, 300);
  }, [state, triggerBombEffect, combo, isMultiplierActive]);

  const toggleMute = () => {
    const newMuted = audioService.toggleMute();
    setIsMuted(newMuted);
    if (!newMuted && state === GameState.PLAYING) audioService.playMusic();
  };

  useEffect(() => {
    if (state === GameState.PLAYING) {
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
        triggerBombEffect(); setIsSlowed(false); setIsMultiplierActive(false); setBubbles([]); setCombo(0);
        setTimeout(() => { setLevelIndex(prev => prev + 1); setState(GameState.PLAYING); }, 3000); 
      }
    }
  }, [score, currentLevel.targetScore, levelIndex, triggerBombEffect]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-screen overflow-hidden transition-all duration-1000 ${currentLevel.bottleColor} ${isShaking ? 'screen-shake' : ''} ${isDistorted ? 'is-distorted' : ''}`} 
      style={{ '--beat-intensity': '0', '--beat-scale': '1', '--beat-brightness': '1' } as any}
    >
      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 70%)`, transform: `scale(var(--beat-scale))`, filter: `brightness(var(--beat-brightness))` }}></div>
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none opacity-20" style={{ background: `linear-gradient(to top, white, transparent)`, transform: `scaleY(calc(0.5 + var(--beat-intensity) * 1.5))`, transformOrigin: 'bottom' }}></div>
      <div className={`absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.4),transparent)] ${isSlowed ? 'animate-pulse' : ''}`}></div>
      {isSlowed && <div className="absolute inset-0 pointer-events-none bg-blue-500/10 z-10 transition-opacity duration-1000"></div>}
      {isMultiplierActive && <div className="absolute inset-0 pointer-events-none bg-yellow-500/5 z-10 transition-opacity duration-500 border-[20px] border-yellow-400/20 blur-xl animate-pulse"></div>}
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
        onToggleTheme={() => setIsDark(!isDark)} isDark={isDark}
        combo={combo}
      />

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
};

export default App;
