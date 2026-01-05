
export interface Level {
  id: number;
  nameKey: string;
  bottleColor: string;
  bubbleColor: string;
  targetScore: number;
  spawnRate: number;
  speedRange: [number, number];
}

export enum BubbleType {
  NORMAL = 'NORMAL',
  SLOW_MO = 'SLOW_MO',
  BOMB = 'BOMB',
  GOLDEN = 'GOLDEN'
}

export interface BubbleData {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  speed: number;
  color: string;
  type: BubbleType;
  mass: number;
}

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER'
}

export type Language = 'en' | 'he' | 'zh' | 'hi' | 'de' | 'es' | 'fr';
export type FontSize = 'small' | 'medium' | 'large';
export type GameSpeed = number;
