
export interface Level {
  id: number;
  name: string;
  bottleColor: string;
  bubbleColor: string;
  targetScore: number;
  spawnRate: number; // milliseconds between spawns
  speedRange: [number, number]; // seconds for animation
}

export enum BubbleType {
  NORMAL = 'NORMAL',
  SLOW_MO = 'SLOW_MO', // Slows down spawn rate
  BOMB = 'BOMB',       // Clears all bubbles
  GOLDEN = 'GOLDEN'    // Extra points
}

export interface BubbleData {
  id: string;
  x: number;
  size: number;
  speed: number;
  color: string;
  type: BubbleType;
}

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER'
}
