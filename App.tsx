
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
  const [isFrozen, setIsFrozen] = useState(false);
  const [isMultiplierActive, setIsMultiplierActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isDistorted, setIsDistorted] = useState(false);
  
  const currentLevel = LEVELS[levelIndex];
  const spawnTimerRef = useRef<number | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);
  const freezeTimeoutRef = useRef<number | null>(null);
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
      
      const elasticity = 0.8; // Bounciness
      const wallElasticity = 0.7;
      const friction = 0.995; // Velocity retention
      const buoyancy = (isSlowed ? -0.1 : (isFrozen ? 0 : -0.25)) * gameSpeed;

      for (let i = 0; i < nextBubbles.length; i++) {
        const b = nextBubbles[i];
        
        if (!isFrozen) {
          // Apply Buoyancy
          b.vy += buoyancy;

          // Effect of STICKY bubbles: slow down others nearby
          for (let j = 0; j < nextBubbles.length; j++) {
            if (i === j) continue;
            const b2 = nextBubbles[j];
            if (b2.type === BubbleType.STICKY) {
              const dx = b2.x - b.x;
              const dy = b2.y - b.y;
              const distSq = dx * dx + dy * dy;
              const stickyRange = 200;
              if (distSq < stickyRange * stickyRange) {
                b.vx *= 0.95;
                b.vy *= 0.95;
              }
            }
            if (b2.type === BubbleType.MAGNET) {
              const dx = b2.x - b.x;
              const dy = b2.y - b.y;
              const distSq = dx * dx + dy * dy;
              const magRange = 300;
              if (distSq < magRange * magRange) {
                const dist = Math.sqrt(distSq);
                const force = (magRange - dist) / 5000;
                b.vx += (dx / dist) * force;
                b.vy += (dy / dist) * force;
              }
            }
          }

          // Move
          b.x += b.vx * gameSpeed;
          b.y += b.vy * gameSpeed;
          b.rotation += b.angularVelocity * gameSpeed;

          // Apply Friction
          b.vx *= friction;
          b.vy *= friction;
          b.angularVelocity *= 0.99;
        }

        // Wall collisions
        if (b.x < 0) { 
          b.x = 0; b.vx *= -wallElasticity; 
          b.angularVelocity += b.vy * 0.05; 
        }
        if (b.x > width - b.size) { 
          b.x = width - b.size; b.vx *= -wallElasticity; 
          b.angularVelocity -= b.vy * 0.05;
        }
        
        // Remove bubbles that float away
        if (b.y < -b.size * 2) {
          nextBubbles.splice(i, 1);
          i--;
          continue;
        }

        // Realistic Bubble-Bubble Collision (Impulse resolution)
        for (let j = i + 1; j < nextBubbles.length; j++) {
          const b2 = nextBubbles[j];
          const b1c = { x: b.x + b.size/2, y: b.y + b.size/2 };
          const b2c = { x: b2.x + b2.size/2, y: b2.y + b2.size/2 };
          const dx = b1c.x - b2c.x;
          const dy = b1c.y - b2c.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (b.size + b2.size) / 2;

          if (distance < minDistance) {
            // Normal vector
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Relative velocity
            const rvx = b.vx - b2.vx;
            const rvy = b.vy - b2.vy;
            const velAlongNormal = rvx * nx + rvy * ny;

            if (velAlongNormal > 0) continue;

            // Impulse magnitude
            const j_impulse = -(1 + elasticity) * velAlongNormal;
            const invMass1 = 1 / b.mass;
            const invMass2 = 1 / b2.mass;
            const impulse = j_impulse / (invMass1 + invMass2);

            // Apply impulse
            b.vx += invMass1 * impulse * nx;
            b.vy += invMass1 * impulse * ny;
            b2.vx -= invMass2 * impulse * nx;
            b2.vy -= invMass2 * impulse * ny;

            // Angular kick
            b.angularVelocity += (b.vx - b2.vx) * 0.02;
            b2.angularVelocity -= (b.vx - b2.vx) * 0.02;

            // Positional correction to prevent sticking
            const percent = 0.5;
            const slop = 0.01;
            const correction = Math.max(minDistance - distance - slop, 0) / (invMass1 + invMass2) * percent;
            b.x += invMass1 * nx * correction;
            b.y += invMass1 * ny * correction;
            b2.x -= invMass2 * nx * correction;
            b2.y -= invMass2 * ny * correction;
          }
        }
      }

      setBubbles(nextBubbles);
      
      const intensity = audioService.getBeatIntensity();
      if (containerRef.current) {
        containerRef.current.style.setProperty('--beat-intensity', intensity.toString());
        containerRef.current.style.setProperty('--beat-scale', (1 + intensity * 0.1).toString());
      }

      animationFrameId = requestAnimationFrame(updatePhysics);
    };
    
    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, isSlowed, isFrozen, gameSpeed]);

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
    const size = 30 + Math.random() * 70; 
    const x = Math.random() * (window.innerWidth - size);
    const y = window.innerHeight + size;
    
    const rand = Math.random();
    let type = BubbleType.NORMAL;
    if (rand < 0.04) type = BubbleType.BOMB;
    else if (rand < 0.12) type = BubbleType.GOLDEN;
    else if (rand < 0.16) type = BubbleType.SLOW_MO;
    else if (rand < 0.20) type = BubbleType.STICKY;
    else if (rand < 0.24) type = BubbleType.MULTIPLIER;
    else if (rand < 0.27) type = BubbleType.MAGNET;
    else if (rand < 0.30) type = BubbleType.FREEZE;

    const baseSpeed = currentLevel.speedRange[0] + Math.random() * (currentLevel.speedRange[1] - currentLevel.speedRange[0]);
    const speed = isSlowed ? baseSpeed * 0.4 : (isFrozen ? 0 : baseSpeed);
    
    const newBubble: BubbleData = {
      id, x, y, size, speed, color: currentLevel.bubbleColor, type,
      vx: (Math.random() - 0.5) * 4,
      vy: -speed,
      rotation: Math.random() * 360,
      angularVelocity: (Math.random() - 0.5) * 8,
      mass: size // Mass based on size for realistic collisions
    };
    setBubbles(prev => [...prev, newBubble]);
  }, [currentLevel, isSlowed, isFrozen]);

  const handleStart = () => { setState(GameState.PLAYING); audioService.playMusic(); };
  const handleResume = () => { setState(GameState.PLAYING); audioService.playMusic(); };
  const handleReset = () => {
    setScore(0); setLevelIndex(0); setBubbles([]); setIsSlowed(false); setIsFrozen(false); setIsMultiplierActive(false); setIsShaking(false); setIsDistorted(false); setCombo(0);
    setState(GameState.START); audioService.pauseMusic();
    if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
    if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
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
      case BubbleType.GOLDEN: points = 15; break;
      case BubbleType.BOMB:
        triggerBombEffect();
        setBubbles(prev => { 
          const count = prev.length;
          setScore(s => s + Math.floor(count * 0.8 * multiplier) + 20); 
          return []; 
        });
        return;
      case BubbleType.SLOW_MO:
        setIsSlowed(true);
        if (slowTimeoutRef.current) clearTimeout(slowTimeoutRef.current);
        slowTimeoutRef.current = window.setTimeout(() => setIsSlowed(false), 5000);
        points = 5;
        break;
      case BubbleType.FREEZE:
        setIsFrozen(true);
        if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
        freezeTimeoutRef.current = window.setTimeout(() => setIsFrozen(false), 3000);
        points = 5;
        break;
      case BubbleType.STICKY:
        points = 10;
        break;
      case BubbleType.MULTIPLIER:
        setIsMultiplierActive(true);
        if (multiplierTimeoutRef.current) clearTimeout(multiplierTimeoutRef.current);
        multiplierTimeoutRef.current = window.setTimeout(() => setIsMultiplierActive(false), 10000);
        points = 5;
        break;
      case BubbleType.MAGNET:
        points = 8;
        break;
      default: points = 1; break;
    }

    setScore(prev => prev + Math.floor(points * multiplier));
    setBubbles(prev => prev.filter(b => b.id !== bubble.id));
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
        triggerBombEffect(); setIsSlowed(false); setIsFrozen(false); setIsMultiplierActive(false); setBubbles([]); setCombo(0);
        setTimeout(() => { setLevelIndex(prev => prev + 1); setState(GameState.PLAYING); }, 3000); 
      }
    }
  }, [score, currentLevel.targetScore, levelIndex, triggerBombEffect]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-screen overflow-hidden transition-all duration-1000 ${currentLevel.bottleColor} ${isShaking ? 'screen-shake' : ''} ${isDistorted ? 'is-distorted' : ''}`} 
    >
      <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 70%)`, transform: `scale(var(--beat-scale, 1))` }}></div>
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none opacity-20" style={{ background: `linear-gradient(to top, white, transparent)`, transform: `scaleY(calc(0.5 + var(--beat-intensity, 0) * 1.5))`, transformOrigin: 'bottom' }}></div>
      <div className={`absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.4),transparent)] ${isSlowed || isFrozen ? 'animate-pulse' : ''}`}></div>
      
      {isSlowed && <div className="absolute inset-0 pointer-events-none bg-blue-500/10 z-10 animate-pulse"></div>}
      {isFrozen && <div className="absolute inset-0 pointer-events-none bg-cyan-200/20 z-10 backdrop-blur-[1px] border-[30px] border-white/20"></div>}
      {isMultiplierActive && <div className="absolute inset-0 pointer-events-none bg-yellow-500/10 z-10 border-[15px] border-yellow-400/30 blur-xl animate-pulse"></div>}

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
