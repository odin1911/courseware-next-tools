import { Howl, Howler, type HowlOptions } from 'howler';

export type AudioPlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

export interface AudioManagerPlayOptions extends HowlOptions {
  interrupt?: boolean;
}

export interface AudioManagerState {
  src: string[];
  status: AudioPlaybackState;
  playing: boolean;
  volume: number;
  loop: boolean;
  rate: number;
  seek: number;
}

type AudioManagerListener = (state: AudioManagerState) => void;

function normalizeSrc(src?: string | string[]) {
  if (!src) {
    return [];
  }

  return Array.isArray(src) ? src : [src];
}

export class AudioManager {
  private sound: Howl | null = null;

  private activePlaybackId: number | null = null;

  private status: AudioPlaybackState = 'idle';

  private currentSrc: string[] = [];

  private listeners = new Set<AudioManagerListener>();

  private endPromise: Promise<Howl> | null = null;

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  private setStatus(status: AudioPlaybackState) {
    this.status = status;
    this.notify();
  }

  private bindSoundLifecycle(sound: Howl) {
    sound.on('play', (playbackId?: number) => {
      if (this.sound === sound) {
        this.activePlaybackId = typeof playbackId === 'number' ? playbackId : this.activePlaybackId;
        this.setStatus('playing');
      }
    });

    sound.on('pause', () => {
      if (this.sound === sound) {
        this.setStatus('paused');
      }
    });

    sound.on('stop', () => {
      if (this.sound === sound) {
        this.activePlaybackId = null;
        this.setStatus('stopped');
      }
    });

    sound.on('end', () => {
      if (this.sound === sound) {
        this.activePlaybackId = null;
        this.setStatus('idle');
      }
    });
  }

  private detachCurrentSound() {
    if (!this.sound) {
      this.currentSrc = [];
      return;
    }

    this.sound.off();
    this.sound.unload();
    this.sound = null;
    this.activePlaybackId = null;
    this.currentSrc = [];
    this.endPromise = null;
    this.setStatus('idle');
  }

  play(options: AudioManagerPlayOptions) {
    const { interrupt = true, ...howlOptions } = options;

    if (!howlOptions.src || normalizeSrc(howlOptions.src).length === 0) {
      throw new Error('AudioManager.play requires a valid src.');
    }

    if (interrupt) {
      this.stop();
    }

    this.detachCurrentSound();

    const sound = new Howl({
      html5: true,
      ...howlOptions,
    });

    this.sound = sound;
    this.currentSrc = normalizeSrc(howlOptions.src);
    this.bindSoundLifecycle(sound);

    const endPromise = new Promise<Howl>((resolve, reject) => {
      sound.once('end', () => {
        resolve(sound);
      });

      sound.once('stop', () => {
        resolve(sound);
      });

      sound.once('loaderror', (_id, error) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });

      sound.once('playerror', (_id, error) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });

    this.endPromise = endPromise;
    this.activePlaybackId = sound.play();
    return { sound, endPromise };
  }

  async asyncPlay(options: AudioManagerPlayOptions) {
    const { endPromise } = this.play(options);
    return endPromise;
  }

  pause() {
    if (this.sound && this.sound.playing()) {
      if (this.activePlaybackId !== null) {
        this.sound.pause(this.activePlaybackId);
        return;
      }

      this.sound.pause();
    }
  }

  resume() {
    if (this.sound && !this.sound.playing() && this.status === 'paused') {
      this.activePlaybackId =
        this.activePlaybackId !== null ? this.sound.play(this.activePlaybackId) : this.sound.play();
    }
  }

  stop() {
    if (this.sound) {
      if (this.activePlaybackId !== null) {
        this.sound.stop(this.activePlaybackId);
        return;
      }

      this.sound.stop();
    }
  }

  stopAll() {
    this.stop();
    Howler.stop();
    return this;
  }

  unload() {
    this.detachCurrentSound();
  }

  destroy() {
    this.unload();
    this.listeners.clear();
  }

  setVolume(volume: number) {
    this.sound?.volume(Math.max(0, Math.min(volume, 1)));
    this.notify();
  }

  setLoop(loop: boolean) {
    this.sound?.loop(loop);
    this.notify();
  }

  setRate(rate: number) {
    this.sound?.rate(rate);
    this.notify();
  }

  seek(seconds: number) {
    this.sound?.seek(seconds);
    this.notify();
  }

  isPlaying() {
    return this.sound?.playing() ?? false;
  }

  getState(): AudioManagerState {
    return {
      src: this.currentSrc,
      status: this.status,
      playing: this.sound?.playing() ?? false,
      volume: this.sound?.volume() ?? 1,
      loop: this.sound?.loop() ?? false,
      rate: this.sound?.rate() ?? 1,
      seek: Number(this.sound?.seek() || 0),
    };
  }

  getCurrentSound() {
    return this.sound;
  }

  getEndPromise() {
    return this.endPromise;
  }

  subscribe(listener: AudioManagerListener) {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export function createAudioManager() {
  return new AudioManager();
}
