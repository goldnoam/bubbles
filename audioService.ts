const VOLUME_KEY_MASTER = 'fizzy_pop_vol_master';
const VOLUME_KEY_MUSIC = 'fizzy_pop_vol_music';
const VOLUME_KEY_SFX = 'fizzy_pop_vol_sfx';
const TRACK_KEY = 'fizzy_pop_track_key';

const TRACKS: Record<string, string> = {
  popcorn: 'https://ia800305.us.archive.org/32/items/Hot_Butter_-_Popcorn_1972/Hot_Butter_-_Popcorn_1972.mp3',
  techno: 'https://assets.mixkit.co/music/preview/mixkit-complex-237.mp3',
  retro: 'https://assets.mixkit.co/music/preview/mixkit-sun-and-spirit-16.mp3',
  none: ''
};

class AudioService {
  private music: HTMLAudioElement | null = null;
  private popSound: HTMLAudioElement | null = null;
  private isMuted: boolean = false; 
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;

  private masterVolume: number = 1.0;
  private musicVolume: number = 0.6;
  private sfxVolume: number = 0.5;
  private currentTrackKey: string = 'popcorn';

  constructor() {
    this.masterVolume = parseFloat(localStorage.getItem(VOLUME_KEY_MASTER) || '1.0');
    this.musicVolume = parseFloat(localStorage.getItem(VOLUME_KEY_MUSIC) || '0.6');
    this.sfxVolume = parseFloat(localStorage.getItem(VOLUME_KEY_SFX) || '0.5');
    this.currentTrackKey = localStorage.getItem(TRACK_KEY) || 'popcorn';
    this.initMusicElement();
    this.popSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
  }

  private initMusicElement() {
    const url = TRACKS[this.currentTrackKey];
    if (this.music) {
      this.music.pause();
      this.music.src = '';
    }
    if (!url) {
      this.music = null;
      return;
    }
    this.music = new Audio(url);
    this.music.loop = true;
    this.music.crossOrigin = "anonymous";
    this.updateMusicVolume();
    this.music.muted = this.isMuted;
  }

  setMusicTrack(trackKey: string) {
    if (this.currentTrackKey === trackKey) return;
    const wasPlaying = this.music ? !this.music.paused : false;
    this.currentTrackKey = trackKey;
    localStorage.setItem(TRACK_KEY, trackKey);
    this.initMusicElement();
    if (wasPlaying && trackKey !== 'none') this.playMusic();
  }

  getMusicTrack() { return this.currentTrackKey; }

  private initAudioContext() {
    if (this.audioContext || !this.music) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioContext.createMediaElementSource(this.music);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) { console.warn("Audio Context initialization failed:", e); }
  }

  setMasterVolume(v: number) { this.masterVolume = v; localStorage.setItem(VOLUME_KEY_MASTER, v.toString()); this.updateMusicVolume(); }
  setMusicVolume(v: number) { this.musicVolume = v; localStorage.setItem(VOLUME_KEY_MUSIC, v.toString()); this.updateMusicVolume(); }
  setSfxVolume(v: number) { this.sfxVolume = v; localStorage.setItem(VOLUME_KEY_SFX, v.toString()); }
  getVolumes() { return { master: this.masterVolume, music: this.musicVolume, sfx: this.sfxVolume }; }

  private updateMusicVolume() { if (this.music) this.music.volume = this.musicVolume * this.masterVolume; }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.music) {
      this.music.muted = this.isMuted;
      if (!this.isMuted) this.playMusic(); else this.pauseMusic();
    }
    return this.isMuted;
  }

  playMusic() {
    if (this.music && !this.isMuted && this.currentTrackKey !== 'none') {
      this.initAudioContext();
      if (this.audioContext?.state === 'suspended') this.audioContext.resume();
      this.music.play().catch(() => console.log("Audio deferred"));
    }
  }

  pauseMusic() { this.music?.pause(); }

  playPop() {
    if (!this.isMuted && this.popSound) {
      const s = this.popSound.cloneNode() as HTMLAudioElement;
      s.volume = this.sfxVolume * this.masterVolume;
      s.play();
    }
  }

  getBeatIntensity(): number {
    if (!this.analyser || !this.dataArray || this.isMuted || !this.music || this.music.paused) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < 15; i++) sum += this.dataArray[i];
    return sum / (15 * 255);
  }

  getMuteStatus() { return this.isMuted; }
}

export const audioService = new AudioService();