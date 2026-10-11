import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';

const CATEGORIES = ['All', 'Favorites', 'Music', 'Gospel', 'News'];

const STATIONS = [
  { id: '1', title: 'Wasafi FM 88.9', desc: 'MP3 • 1 listening', logo: 'W', color: '#E06C3A' },
  { id: '2', title: 'Clouds FM', desc: 'MP3 • 128 kbps', logo: 'C', color: '#1877F2' },
  { id: '3', title: 'RADIO MARIA TANZANIA', desc: 'AAC+ • 32 kbps', logo: 'RM', color: '#0F9D58' },
  { id: '4', title: 'East Africa Radio', desc: 'MP3 • 64 kbps', logo: 'EA', color: '#DB4437' },
];

export default function FMRadioScreen() {
  const { COLORS } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Top Player Area */}
        <View style={styles.topPlayerArea}>
          <Text style={styles.liveText}>LIVE</Text>
          <View style={styles.listenerCount}>
            <Ionicons name="people" size={12} color="#aaa" />
            <Text style={styles.listenerText}>1 listening</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity><Ionicons name="heart-outline" size={28} color="#aaa" /></TouchableOpacity>
            <TouchableOpacity 
              style={styles.mainPlayBtn}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#000" />
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
        <View style={styles.featuredCard}>
          <View style={styles.featuredIconBox}>
            <Ionicons name="musical-notes" size={24} color="#FFF" />
          </View>
          <View style={styles.featuredInfo}>
            <Text style={styles.featuredTitle}>Bongo AI Radio</Text>
            <Text style={styles.featuredDesc}>Non-stop AI songs made on Bongo</Text>
          </View>
          <TouchableOpacity style={styles.featuredPlay}>
            <Ionicons name="play" size={20} color="#1DB954" />
          </TouchableOpacity>
        </View>

        {/* Recently Played */}
        <Text style={styles.sectionTitle}>Recently played</Text>
        <View style={styles.recentItem}>
          <View style={[styles.recentCircle, { backgroundColor: '#FFF' }]}>
            <Text style={{ color: '#E06C3A', fontWeight: 'bold', fontSize: 24 }}>W</Text>
          </View>
          <Text style={styles.recentText} numberOfLines={1}>Wasafi FM...</Text>
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
            <View key={station.id} style={styles.stationRow}>
              <View style={[styles.stationLogo, { backgroundColor: '#FFF' }]}>
                <Text style={{ color: station.color, fontWeight: '900', fontSize: 20 }}>{station.logo}</Text>
              </View>
              <View style={styles.stationDetails}>
                <Text style={styles.stationName}>{station.title}</Text>
                <Text style={styles.stationDesc}>{station.desc}</Text>
              </View>
              <TouchableOpacity style={{ marginRight: 16 }}>
                <Ionicons name="heart-outline" size={24} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.listPlayBtn}>
                <Ionicons name="play" size={16} color="#000" />
              </TouchableOpacity>
            </View>
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
