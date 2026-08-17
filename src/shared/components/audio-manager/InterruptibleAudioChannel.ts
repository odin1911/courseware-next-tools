import {
  createAudioManager,
  type AudioManager,
  type AudioManagerPlayOptions,
  type AudioManagerState,
} from './AudioManager';

export interface InterruptibleAudioChannelState extends AudioManagerState {
  activeSessionToken: number;
  activeRequestKey: string | null;
}

export interface InterruptibleAudioPlayResult {
  interrupted: boolean;
}

type InterruptibleAudioChannelListener = (state: InterruptibleAudioChannelState) => void;

export class InterruptibleAudioChannel {
  private readonly audioManager: AudioManager;

  private readonly listeners = new Set<InterruptibleAudioChannelListener>();

  private unsubscribeAudioManager: (() => void) | null = null;

  private activeSessionToken = 0;

  private activeRequestKey: string | null = null;

  constructor(audioManager: AudioManager = createAudioManager()) {
    this.audioManager = audioManager;
    this.unsubscribeAudioManager = this.audioManager.subscribe((audioState) => {
      if (!audioState.playing && audioState.status !== 'paused') {
        this.activeRequestKey = null;
      }

      this.notify();
    });
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  beginSession() {
    this.activeSessionToken += 1;
    this.activeRequestKey = null;
    this.audioManager.stop();
    this.notify();
    return this.activeSessionToken;
  }

  isSessionActive(token: number) {
    return token === this.activeSessionToken;
  }

  async playInSession(
    token: number,
    options: AudioManagerPlayOptions,
    requestKey?: string,
  ): Promise<InterruptibleAudioPlayResult> {
    if (!this.isSessionActive(token)) {
      return { interrupted: true };
    }

    try {
      const { endPromise } = this.audioManager.play({
        ...options,
        // Session 切换已在 beginSession()/上一次播放的 detach 中完成，这里避免再触发一次 stop
        // 把刚设置好的 activeRequestKey 又被旧声音生命周期回调清空。
        interrupt: false,
      });

      this.activeRequestKey = requestKey ?? null;
      this.notify();

      await endPromise;
    } catch (error) {
      if (!this.isSessionActive(token)) {
        return { interrupted: true };
      }

      this.activeRequestKey = null;
      this.notify();
      throw error;
    }

    const interrupted = !this.isSessionActive(token);

    if (!interrupted) {
      this.activeRequestKey = null;
      this.notify();
    }

    return { interrupted };
  }

  async play(options: AudioManagerPlayOptions, requestKey?: string) {
    const token = this.beginSession();
    return this.playInSession(token, options, requestKey);
  }

  stop() {
    this.activeRequestKey = null;
    this.audioManager.stop();
    this.notify();
  }

  destroy() {
    this.unsubscribeAudioManager?.();
    this.unsubscribeAudioManager = null;
    this.audioManager.destroy();
    this.listeners.clear();
  }

  getState(): InterruptibleAudioChannelState {
    return {
      ...this.audioManager.getState(),
      activeSessionToken: this.activeSessionToken,
      activeRequestKey: this.activeRequestKey,
    };
  }

  subscribe(listener: InterruptibleAudioChannelListener) {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export function createInterruptibleAudioChannel() {
  return new InterruptibleAudioChannel();
}
