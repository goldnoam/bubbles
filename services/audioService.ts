
class AudioService {
  private music: HTMLAudioElement | null = null;
  private popSound: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;

  constructor() {
    // High quality synth-pop 'Popcorn' loop
    this.music = new Audio('https://ia800305.us.archive.org/32/items/Hot_Butter_-_Popcorn_1972/Hot_Butter_-_Popcorn_1972.mp3');
    this.music.loop = true;
    this.music.volume = 0.6;
    this.music.crossOrigin = "anonymous";
    
    // Snappier pop sound
    this.popSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
  }

  private initAudioContext() {
    if (this.audioContext || !this.music) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.source = this.audioContext.createMediaElementSource(this.music);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.music) {
      this.music.muted = this.isMuted;
      if (!this.isMuted) {
        this.playMusic();
      }
    }
    return this.isMuted;
  }

  playMusic() {
    if (this.music && !this.isMuted) {
      this.initAudioContext();
      if (this.audioContext?.state === 'suspended') {
        this.audioContext.resume();
      }
      this.music.play().catch(e => console.log("Audio play deferred until user interaction"));
    }
  }

  pauseMusic() {
    this.music?.pause();
  }

  playPop() {
    if (!this.isMuted && this.popSound) {
      const s = this.popSound.cloneNode() as HTMLAudioElement;
      s.volume = 0.4;
      s.play();
    }
  }

  getBeatIntensity(): number {
    if (!this.analyser || !this.dataArray || this.isMuted || !this.music || this.music.paused) return 0;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Popcorn has prominent mid-high synth leads and a steady bass beat.
    // We'll average the lower-mid frequencies for a "pulsing" feel.
    let sum = 0;
    const binsToAnalyze = 15; // Low frequencies
    for (let i = 0; i < binsToAnalyze; i++) {
      sum += this.dataArray[i];
    }
    
    return sum / (binsToAnalyze * 255);
  }

  getMuteStatus() {
    return this.isMuted;
  }
}

export const audioService = new AudioService();
