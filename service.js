import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function() {
  try {
    // Handle play/pause from notification shade, lock screen, Bluetooth, headphones, etc.
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
      TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
      TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
      TrackPlayer.stop();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
      try {
        const { usePlayerStore } = require('./store/playerStore');
        usePlayerStore.getState().skipNext();
      } catch (e) {
        TrackPlayer.skipToNext().catch(() => {});
      }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      try {
        const { usePlayerStore } = require('./store/playerStore');
        usePlayerStore.getState().skipPrev();
      } catch (e) {
        TrackPlayer.skipToPrevious().catch(() => {});
      }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
      TrackPlayer.seekTo(event.position);
    });
  } catch (error) {
    console.error("BACKGROUND SERVICE CRASHED:", error);
  }
};
