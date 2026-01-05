
import { Level } from './types';

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "קולה קלאסית",
    bottleColor: "bg-[#2b1108]",
    bubbleColor: "bg-white/40",
    targetScore: 20,
    spawnRate: 800,
    speedRange: [6, 10]
  },
  {
    id: 2,
    name: "לימון ליים",
    bottleColor: "bg-[#1d4d1d]",
    bubbleColor: "bg-[#ccffcc]/50",
    targetScore: 40,
    spawnRate: 600,
    speedRange: [5, 8]
  },
  {
    id: 3,
    name: "תפוז מוגז",
    bottleColor: "bg-[#e67e22]",
    bubbleColor: "bg-[#f1c40f]/60",
    targetScore: 70,
    spawnRate: 450,
    speedRange: [4, 7]
  },
  {
    id: 4,
    name: "ענבים סגולים",
    bottleColor: "bg-[#4a148c]",
    bubbleColor: "bg-[#e1bee7]/50",
    targetScore: 110,
    spawnRate: 350,
    speedRange: [3, 6]
  },
  {
    id: 5,
    name: "מי סודה כחולים",
    bottleColor: "bg-[#01579b]",
    bubbleColor: "bg-[#b3e5fc]/60",
    targetScore: 160,
    spawnRate: 250,
    speedRange: [2, 5]
  }
];

// Synthesis of "Popcorn" melody roughly using simple oscillator would be complex, 
// so we'll provide a URL to a representative MIDI/Synthesized version.
export const POPCORN_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 
// Note: In a production app, we would use a proper loop of the actual Popcorn synth melody.
