// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { useProgress, usePlaybackState, State } from '../store/playerStore';
import { useRouter } from 'expo-router';
import { GlassView as BlurView } from '@/components/GlassView';
import { LinearGradient } from 'expo-linear-gradient';

export default function MiniPlayer() {
  const router = useRouter();
  const { currentTrack, togglePlayPause, closePlayer, markPlayCounted, hasCountedPlay } = usePlayerStore();
  const { position, duration } = useProgress();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing || playbackState.state === State.Buffering;

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;
    if (isPlaying) {
      animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
          easing: Easing.linear
        })
      );
      animation.start();
    } else {
      spinValue.stopAnimation();
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isPlaying]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  useEffect(() => {
    if (position >= 30 && !hasCountedPlay && currentTrack) {
      markPlayCounted();
    }
  }, [position, hasCountedPlay, currentTrack]);

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      {Platform.OS === "android" && (
        <LinearGradient colors={["rgba(30, 30, 30, 0.95)", "rgba(20, 20, 20, 0.98)"]} style={StyleSheet.absoluteFill} />
      )}
      
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/player')}
        style={styles.card}
      >
        {/* Album art (Spinning Circle like Studio) */}
        {currentTrack.cover_url ? (
          <Animated.Image 
            source={{ uri: currentTrack.cover_url }} 
            style={[styles.cover, { transform: [{ rotate: spin }] }]} 
          />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Ionicons name='musical-note' size={18} color='rgba(255,255,255,0.4)' />
          </View>
        )}
        
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist_name || 'V6-DAPAZ'}</Text>
        </View>

        <TouchableOpacity style={[styles.ctrlBtn, { marginRight: 4 }]} onPress={(e) => { e?.stopPropagation?.(); togglePlayPause(); }}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color='#fff' />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.ctrlBtn} onPress={(e) => { e?.stopPropagation?.(); closePlayer(); }}>
          <Ionicons name='close' size={24} color='rgba(255,255,255,0.6)' />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 10,
    marginTop: 0,
    borderRadius: 28,
    minHeight: 56,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: 'transparent',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cover: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 10,
  },
  coverFallback: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  artist: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  ctrlBtn: { padding: 6 },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  progressFill: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});