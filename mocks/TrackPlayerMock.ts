export enum State {
  None = 'none',
  Ready = 'ready',
  Playing = 'playing',
  Paused = 'paused',
  Stopped = 'stopped',
  Buffering = 'buffering',
  Loading = 'loading',
  Error = 'error',
}
export enum Event {
  PlaybackState = 'playback-state',
  PlaybackError = 'playback-error',
  PlaybackQueueEnded = 'playback-queue-ended',
  PlaybackTrackChanged = 'playback-track-changed',
  PlaybackActiveTrackChanged = 'playback-active-track-changed',
  PlaybackProgressUpdated = 'playback-progress-updated',
  RemotePlay = 'remote-play',
  RemotePause = 'remote-pause',
  RemoteStop = 'remote-stop',
  RemoteNext = 'remote-next',
  RemotePrevious = 'remote-previous',
  RemoteJumpForward = 'remote-jump-forward',
  RemoteJumpBackward = 'remote-jump-backward',
  RemoteSeek = 'remote-seek',
}
export enum AppKilledPlaybackBehavior {
  ContinuePlayback = 'continue-playback',
  PausePlayback = 'pause-playback',
  StopPlaybackAndRemoveNotification = 'stop-playback-and-remove-notification',
}
export enum Capability {
  Play = 0,
  PlayFromId = 1,
  PlayFromSearch = 2,
  Pause = 3,
  Stop = 4,
  SeekTo = 5,
  Skip = 6,
  SkipToNext = 7,
  SkipToPrevious = 8,
  JumpForward = 9,
  JumpBackward = 10,
  SetRating = 11,
  Like = 12,
  Dislike = 13,
  Bookmark = 14,
}
export enum IOSCategory {
  Playback = 'playback',
  PlayAndRecord = 'playAndRecord',
  MultiRoute = 'multiRoute',
  Ambient = 'ambient',
  SoloAmbient = 'soloAmbient',
  Record = 'record',
}
export enum IOSCategoryMode {
  Default = 'default',
  GameChat = 'gameChat',
  Measurement = 'measurement',
  MoviePlayback = 'moviePlayback',
  SpokenAudio = 'spokenAudio',
  VideoChat = 'videoChat',
  VideoRecording = 'videoRecording',
  VoiceChat = 'voiceChat',
  VoicePrompt = 'voicePrompt',
}
export enum IOSCategoryOptions {
  MixWithOthers = 1,
  DuckOthers = 2,
  InterruptSpokenAudioAndMixWithOthers = 17,
  AllowBluetooth = 4,
  AllowBluetoothA2DP = 32,
  AllowAirPlay = 64,
  DefaultToSpeaker = 8,
}
export enum PitchAlgorithm {
  Linear = 0,
  Music = 1,
  Voice = 2,
}

// Expo Go compatible player: same API as react-native-track-player, backed by expo-audio.
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

type Listener = (e: any) => void;
const listeners: Record<string, Set<Listener>> = {};
const emit = (ev: string, payload: any = {}) => {
  listeners[ev]?.forEach(fn => { try { fn(payload); } catch (e) {} });
};

let queue: any[] = [];
let index = 0;
let player: AudioPlayer | null = null;
let sub: any = null;
let rate = 1;
let volume = 1;
let state: State = State.None;
let progressTimer: any = null;
let endedFired = false;

const setState = (s: State) => {
  if (s === state) return;
  state = s;
  emit(Event.PlaybackState, { state: s });
};

const destroy = () => {
  try { sub?.remove?.(); } catch (e) {}
  sub = null;
  if (player) {
    try { (player as any).setActiveForLockScreen?.(false); } catch (e) {}
    try { player.pause(); } catch (e) {}
    try { player.remove(); } catch (e) {}
  }
  player = null;
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
};

const load = (track: any) => {
  destroy();
  if (!track) return;
  endedFired = false;
  const src = typeof track.url === 'string' ? { uri: track.url } : track.url;
  player = createAudioPlayer(src, { updateInterval: 500 } as any);
  try { player.volume = volume; } catch (e) {}
  try { if (rate !== 1) player.setPlaybackRate(rate); } catch (e) {}
  // Lock screen / Control Center controls (needs a native build; ignored where unsupported)
  try {
    const art = typeof track.artwork === 'string' && /^https?:/.test(track.artwork) ? track.artwork : undefined;
    (player as any).setActiveForLockScreen?.(
      true,
      { title: track.title, artist: track.artist, artworkUrl: art },
      track.isLiveStream ? { isLiveStream: true } : { showSeekForward: true, showSeekBackward: true },
    );
  } catch (e) {}
  setState(State.Loading);
  sub = player.addListener('playbackStatusUpdate', (st: any) => {
    if (st.error) { setState(State.Error); emit(Event.PlaybackError, { message: String(st.error) }); return; }
    if (st.didJustFinish && !endedFired) {
      endedFired = true;
      if (index < queue.length - 1) {
        index += 1;
        load(queue[index]);
        player?.play();
        emit(Event.PlaybackActiveTrackChanged, { index, track: queue[index] });
      } else {
        setState(State.Stopped);
        emit(Event.PlaybackQueueEnded, { track: index, position: st.currentTime || 0 });
      }
      return;
    }
    if (st.playing) setState(st.isBuffering ? State.Buffering : State.Playing);
    else if (st.isBuffering) setState(State.Buffering);
    else if (st.isLoaded) setState(state === State.Loading ? State.Ready : State.Paused);
  });
  progressTimer = setInterval(() => {
    if (!player) return;
    const position = player.currentTime || 0;
    const duration = player.duration || 0;
    emit(Event.PlaybackProgressUpdated, { position, duration, buffered: duration, track: index });
  }, 1000);
};

let modeSet = false;
const ensureMode = async () => {
  if (modeSet) return;
  modeSet = true;
  try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' } as any); } catch (e) {}
};

const TrackPlayer = {
  setupPlayer: async () => { await ensureMode(); },
  updateOptions: async () => {},
  add: async (tracks: any) => {
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    const wasEmpty = queue.length === 0;
    queue.push(...arr);
    if (wasEmpty) { index = 0; load(queue[0]); }
  },
  play: async () => {
    await ensureMode();
    if (!player && queue[index]) load(queue[index]);
    player?.play();
    setState(State.Playing);
  },
  pause: async () => { player?.pause(); setState(State.Paused); },
  stop: async () => { player?.pause(); try { player?.seekTo(0); } catch (e) {} setState(State.Stopped); },
  reset: async () => { destroy(); queue = []; index = 0; setState(State.None); },
  skip: async (i: number) => { if (queue[i]) { index = i; load(queue[i]); player?.play(); } },
  skipToNext: async () => { if (index < queue.length - 1) { index += 1; load(queue[index]); player?.play(); } },
  skipToPrevious: async () => { if (index > 0) { index -= 1; load(queue[index]); player?.play(); } },
  remove: async (i: number | number[]) => {
    const ids = (Array.isArray(i) ? i : [i]).sort((a, b) => b - a);
    ids.forEach(x => { if (x !== index) { queue.splice(x, 1); if (x < index) index -= 1; } });
  },
  getTrack: async (i: number) => queue[i] ?? null,
  getActiveTrack: async () => queue[index] ?? null,
  getActiveTrackIndex: async () => (queue.length ? index : undefined),
  getQueue: async () => [...queue],
  skipToIndex: async (i: number) => TrackPlayer.skip(i),
  updateMetadataForTrack: async () => {},
  clearNowPlayingMetadata: async () => {},
  updateNowPlayingMetadata: async () => {},
  getPlaybackState: async () => ({ state }),
  getVolume: async () => volume,
  setVolume: async (v: number) => { volume = v; try { if (player) player.volume = v; } catch (e) {} },
  getRate: async () => rate,
  setRate: async (r: number) => { rate = r; try { player?.setPlaybackRate(r); } catch (e) {} },
  getProgress: async () => {
    const position = player?.currentTime || 0;
    const duration = player?.duration || 0;
    return { position, duration, buffered: duration };
  },
  seekTo: async (sec: number) => { try { await player?.seekTo(sec); } catch (e) {} },
  addEventListener: (ev: string, fn: Listener) => {
    (listeners[ev] ||= new Set()).add(fn);
    return { remove: () => listeners[ev]?.delete(fn) };
  },
};

export default TrackPlayer;
