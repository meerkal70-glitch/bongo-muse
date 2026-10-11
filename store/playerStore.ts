import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  isPodcast?: boolean;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  queue: Track[];
  history: Track[];
  expoPlayer: AudioPlayer | null;
  
  // Actions
  play: (track: Track) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      isBuffering: false,
      queue: [],
      history: [],
      expoPlayer: null,

      play: async (track) => {
        const state = get();
        
        // Clean up previous player if exists
        if (state.expoPlayer) {
          state.expoPlayer.pause();
          // Attempting to reset/cleanup
        }

        const player = createAudioPlayer(track.url);
        
        set({ 
          currentTrack: track,
          isPlaying: true,
          expoPlayer: player
        });
        
        player.play();
        
        // Add to history
        if (state.currentTrack && state.currentTrack.id !== track.id) {
          set(s => ({
            history: [s.currentTrack!, ...s.history].slice(0, 20)
          }));
        }
      },

      pause: async () => {
        const state = get();
        if (state.expoPlayer) {
          state.expoPlayer.pause();
          set({ isPlaying: false });
        }
      },

      resume: async () => {
        const state = get();
        if (state.expoPlayer) {
          state.expoPlayer.play();
          set({ isPlaying: true });
        }
      },

      skipToNext: async () => {
        const state = get();
        if (state.queue.length > 0) {
          const [nextTrack, ...remainingQueue] = state.queue;
          set({ queue: remainingQueue });
          await state.play(nextTrack);
        } else {
          // If no queue, just pause
          await state.pause();
        }
      },

      skipToPrevious: async () => {
        const state = get();
        if (state.history.length > 0) {
          const [prevTrack, ...remainingHistory] = state.history;
          
          if (state.currentTrack) {
            set(s => ({ queue: [s.currentTrack!, ...s.queue] }));
          }
          
          set({ history: remainingHistory });
          await state.play(prevTrack);
        }
      },

      addToQueue: (track) => {
        set(state => ({
          queue: [...state.queue, track]
        }));
      },

      clearQueue: () => {
        set({ queue: [] });
      },
    }),
    {
      name: 'bongo-player-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        history: state.history 
        // We don't persist currentTrack/queue because audio sessions don't survive app kill well
      }),
    }
  )
);
