// @ts-nocheck
import { Alert } from 'react-native';
import 'react-native-gesture-handler';
import 'react-native-reanimated';


// Catch any unhandled JS errors and show them in a native alert before crashing
const originalHandler = (global as any).ErrorUtils?.getGlobalHandler();
if ((global as any).ErrorUtils) {
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    try {
      Alert.alert(
        'Fatal JS Error Caught!',
        `Error: ${error.message}\n\nPlease take a screenshot of this error.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error('Failed to show error alert', e);
    }
    
    setTimeout(() => {
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    }, 2000);
  });
}

import TrackPlayer from 'react-native-track-player';
import { Platform } from 'react-native';

try {
  if (Platform.OS !== 'android') {
    TrackPlayer.registerPlaybackService(() => require('./service.js'));
  }
} catch (e) {
  console.log("TrackPlayer service registration failed", e);
}

require('expo-router/entry');
