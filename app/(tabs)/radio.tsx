import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';

let TrackPlayer: any = null;
let State: any = null;
let usePlaybackState: any = () => ({ state: 'none' });

if (Platform.OS !== 'web') {
  const trackPlayerModule = require('react-native-track-player');
  TrackPlayer = trackPlayerModule.default;
  State = trackPlayerModule.State;
  usePlaybackState = trackPlayerModule.usePlaybackState;
}

const CATEGORIES = ['All', 'Favorites', 'Music', 'Gospel', 'News'];

const STATIONS = [
  { id: 'wasafi', title: 'Wasafi FM 88.9', desc: 'MP3 • 1 listening', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Wasafi_Classic_Baby_Logo.png/600px-Wasafi_Classic_Baby_Logo.png', streamUrl: 'https://icecast.omnycontent.com/fallback' },
  { id: 'clouds', title: 'Clouds FM', desc: 'MP3 • 128 kbps', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Clouds_FM_Logo.jpg/220px-Clouds_FM_Logo.jpg', streamUrl: 'https://icecast.omnycontent.com/fallback' },
  { id: 'radiomaria', title: 'RADIO MARIA TANZANIA', desc: 'AAC+ • 32 kbps', logo: 'https://www.radiomaria.tz/wp-content/uploads/2021/04/Logo-Radio-Maria-Tanzania.png', streamUrl: 'https://icecast.omnycontent.com/fallback' },
  { id: 'eastafrica', title: 'East Africa Radio', desc: 'MP3 • 64 kbps', logo: 'https://ea-radio.vercel.app/logo.png', streamUrl: 'https://icecast.omnycontent.com/fallback' },
];

export default function FMRadioScreen() {
  const { COLORS } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  
  const playbackState = usePlaybackState();
  const [currentStation, setCurrentStation] = useState<any>(null);

  const isPlaying = playbackState.state === State.Playing || playbackState.state === State.Buffering;

  const playStation = async (station: any) => {
    setCurrentStation(station);
    if (Platform.OS === 'web') {
      alert("Audio streaming is not supported on web in this environment yet.");
      return;
    }
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: station.id,
      url: station.streamUrl,
      title: station.title,
      artist: 'Live Radio',
      artwork: station.logo,
    });
    await TrackPlayer.play();
  };

  const togglePlay = async () => {
    if (Platform.OS === 'web') {
      alert("Audio streaming is not supported on web in this environment yet.");
      return;
    }
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      if (currentStation) {
        await TrackPlayer.play();
      } else {
        playStation(STATIONS[0]);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Top Player Area */}
        <View style={styles.topPlayerArea}>
          <Text style={styles.liveText}>LIVE</Text>
          <View style={styles.listenerCount}>
            <Ionicons name="people" size={12} color="#aaa" />
            <Text style={styles.listenerText}>{currentStation ? '1 listening' : 'Not playing'}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity><Ionicons name="heart-outline" size={28} color="#aaa" /></TouchableOpacity>
            <TouchableOpacity 
              style={styles.mainPlayBtn}
              onPress={togglePlay}
            >
              {playbackState.state === State.Buffering ? (
                <Ionicons name="ellipsis-horizontal" size={36} color="#000" />
              ) : (
                <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#000" />
              )}
            </TouchableOpacity>
            <TouchableOpacity><Ionicons name="moon-outline" size={28} color="#aaa" /></TouchableOpacity>
          </View>

          <View style={styles.sleepTimerRow}>
            <Text style={styles.sleepTimerText}>Sleep timer</Text>
            {['15m', '30m', '60m'].map(t => (
              <TouchableOpacity key={t} style={styles.timerPill}>
                <Text style={styles.timerPillText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Card */}
        <TouchableOpacity style={styles.featuredCard} onPress={() => playStation({ id: 'ai', title: 'Bongo AI Radio', logo: '', streamUrl: 'https://icecast.omnycontent.com/fallback' })}>
          <View style={styles.featuredIconBox}>
            <Ionicons name="musical-notes" size={24} color="#FFF" />
          </View>
          <View style={styles.featuredInfo}>
            <Text style={styles.featuredTitle}>Bongo AI Radio</Text>
            <Text style={styles.featuredDesc}>Non-stop AI songs made on Bongo</Text>
          </View>
          <TouchableOpacity style={styles.featuredPlay} onPress={() => playStation({ id: 'ai', title: 'Bongo AI Radio', logo: '', streamUrl: 'https://icecast.omnycontent.com/fallback' })}>
            <Ionicons name={currentStation?.id === 'ai' && isPlaying ? "pause" : "play"} size={20} color="#1DB954" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Recently Played */}
        <Text style={styles.sectionTitle}>Recently played</Text>
        <View style={styles.recentItem}>
          <View style={[styles.recentCircle, { backgroundColor: '#FFF', overflow: 'hidden' }]}>
            <Image source={{ uri: STATIONS[0].logo }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          </View>
          <Text style={styles.recentText} numberOfLines={1}>{STATIONS[0].title}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput 
            placeholder="Search stations" 
            placeholderTextColor="#888"
            style={styles.searchInput}
          />
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Station List */}
        <View style={styles.listContainer}>
          {STATIONS.map(station => (
            <TouchableOpacity key={station.id} style={styles.stationRow} onPress={() => playStation(station)}>
              <View style={[styles.stationLogo, { backgroundColor: '#FFF', overflow: 'hidden' }]}>
                 <Image source={{ uri: station.logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
              <View style={styles.stationDetails}>
                <Text style={[styles.stationName, currentStation?.id === station.id && { color: '#1DB954' }]}>{station.title}</Text>
                <Text style={styles.stationDesc}>{station.desc}</Text>
              </View>
              <TouchableOpacity style={{ marginRight: 16 }}>
                <Ionicons name="heart-outline" size={24} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.listPlayBtn} onPress={() => playStation(station)}>
                <Ionicons name={currentStation?.id === station.id && isPlaying ? "pause" : "play"} size={16} color="#000" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090909' },
  topPlayerArea: { alignItems: 'center', paddingVertical: 20 },
  liveText: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  listenerCount: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  listenerText: { color: '#aaa', fontSize: 13 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 40, marginVertical: 20 },
  mainPlayBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center' },
  sleepTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sleepTimerText: { color: '#aaa', fontSize: 14 },
  timerPill: { borderWidth: 1, borderColor: '#555', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  timerPillText: { color: '#FFF', fontSize: 12 },
  
  featuredCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#181818', marginHorizontal: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1DB954' },
  featuredIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  featuredInfo: { flex: 1 },
  featuredTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  featuredDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  featuredPlay: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(29,185,84,0.2)', justifyContent: 'center', alignItems: 'center' },
  
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 24, marginBottom: 16 },
  recentItem: { marginHorizontal: 16, width: 70, alignItems: 'center' },
  recentCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  recentText: { color: '#aaa', fontSize: 12 },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', marginHorizontal: 16, marginTop: 24, paddingHorizontal: 12, height: 46, borderRadius: 8, gap: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16 },
  
  categoriesScroll: { marginTop: 16, paddingHorizontal: 16, marginBottom: 16 },
  categoryPill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#444', marginRight: 10 },
  categoryPillActive: { backgroundColor: '#1DB954', borderColor: '#1DB954' },
  categoryText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  categoryTextActive: { color: '#000' },
  
  listContainer: { paddingHorizontal: 16 },
  stationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  stationLogo: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stationDetails: { flex: 1 },
  stationName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  stationDesc: { color: '#888', fontSize: 13 },
  listPlayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center' },
});
