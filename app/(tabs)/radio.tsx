import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { usePlayerStore } from '../../store/playerStore';

const CATEGORIES = ['All', 'Favorites', 'Music', 'Gospel', 'News'];

// Stations we list by hand (not in the Radio Browser directory or missing)
const FEATURED_STATIONS = [
  { id: 'wasafi', title: 'Wasafi FM 88.9', cat: 'Music', desc: 'MP3 • 1 listening', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Wasafi_Classic_Baby_Logo.png/600px-Wasafi_Classic_Baby_Logo.png', streamUrl: 'https://radio.wasafimedia.co.tz/wasafi' },
];

const GOSPEL_RE = /gospel|christian|church|religio|worship|bible|mungu|heaven|nuru|maria|kwizera|glorious|injili|praise/i;
const NEWS_RE = /news|talk|habari|tbc|parliament|sports/i;

const categorize = (name: string, tags: string) => {
  const t = `${name} ${tags || ''}`;
  if (GOSPEL_RE.test(t)) return 'Gospel';
  if (NEWS_RE.test(t)) return 'News';
  return 'Music';
};

export default function FMRadioScreen() {
  const { COLORS } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  
  const { currentTrack, isPlaying, play, pause, resume } = usePlayerStore();
  
  const [stations, setStations] = useState<any[]>(FEATURED_STATIONS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const res = await fetch('https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/TZ?hidebroken=true&order=votes&reverse=true&limit=80');
      const raw = await res.json();
      
      const seen = new Set<string>();
      const out: any[] = [...FEATURED_STATIONS];
      seen.add('wasafifm889');
      
      for (const s of raw) {
        let origUrl: string = s.url_resolved || s.url || '';
        if (!origUrl) continue;
        
        if (/\.(m3u|pls)(\?|$)/i.test(origUrl)) {
          if (/zeno\.fm/i.test(origUrl)) origUrl = origUrl.replace(/\.(m3u|pls)(\?.*)?$/i, '');
          else continue;
        }
        if (/\.m3u8(\?|$)/i.test(origUrl)) continue;
        if (/JamendoLounge/i.test(origUrl)) continue;
        
        const key = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        
        let logo = s.favicon || '';
        if (!logo || logo === 'null' || !logo.startsWith('http')) {
          logo = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${new URL(origUrl).hostname.replace(/^www\./, '')}&size=128`;
        }
        
        out.push({
          id: s.stationuuid,
          title: (s.name || 'Unknown').trim(),
          cat: categorize(s.name || '', s.tags || ''),
          desc: `${s.codec || 'MP3'} • ${s.bitrate || 0} kbps`,
          logo,
          streamUrl: origUrl,
        });
      }
      setStations(out);
    } catch (e) {
      console.warn("Could not fetch stations", e);
    } finally {
      setLoading(false);
    }
  };

  const playStation = async (station: any) => {
    if (Platform.OS === 'web') {
      alert("Audio streaming is not supported on web in this environment yet.");
      return;
    }

    play({
      id: station.id,
      url: station.streamUrl,
      title: station.title,
      artist: 'Live Radio',
      artwork: station.logo,
    });
  };

  const togglePlay = async () => {
    if (Platform.OS === 'web') {
      alert("Audio streaming is not supported on web in this environment yet.");
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      if (currentTrack) {
        resume();
      } else {
        playStation(stations[0] || FEATURED_STATIONS[0]);
      }
    }
  };

  const filteredStations = stations.filter(s => {
    if (activeCategory !== 'All' && s.cat !== activeCategory && activeCategory !== 'Favorites') return false;
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const displayTrack = currentTrack || { title: FEATURED_STATIONS[0].title, artwork: FEATURED_STATIONS[0].logo, id: FEATURED_STATIONS[0].id };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Top Player Area */}
        <View style={styles.topPlayerArea}>
          <Text style={styles.liveText}>LIVE</Text>
          <View style={styles.listenerCount}>
            <Ionicons name="people" size={12} color="#aaa" />
            <Text style={styles.listenerText}>{currentTrack ? '1 listening' : 'Not playing'}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity><Ionicons name="heart-outline" size={28} color="#aaa" /></TouchableOpacity>
            <TouchableOpacity 
              style={styles.mainPlayBtn}
              onPress={togglePlay}
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
        <TouchableOpacity style={styles.featuredCard} onPress={() => playStation({ id: 'ai', title: 'Bongo AI Radio', logo: '', streamUrl: 'https://icecast.omnycontent.com/fallback' })}>
          <View style={styles.featuredIconBox}>
            <Ionicons name="musical-notes" size={24} color="#FFF" />
          </View>
          <View style={styles.featuredInfo}>
            <Text style={styles.featuredTitle}>Bongo AI Radio</Text>
            <Text style={styles.featuredDesc}>Non-stop AI songs made on Bongo</Text>
          </View>
          <TouchableOpacity style={styles.featuredPlay} onPress={() => playStation({ id: 'ai', title: 'Bongo AI Radio', logo: '', streamUrl: 'https://icecast.omnycontent.com/fallback' })}>
            <Ionicons name={currentTrack?.id === 'ai' && isPlaying ? "pause" : "play"} size={20} color="#1DB954" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Recently Played */}
        <Text style={styles.sectionTitle}>Recently played</Text>
        <View style={styles.recentItem}>
          <View style={[styles.recentCircle, { backgroundColor: '#FFF', overflow: 'hidden' }]}>
            <Image source={{ uri: displayTrack.artwork || displayTrack.logo }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          </View>
          <Text style={styles.recentText} numberOfLines={1}>{displayTrack.title}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput 
            placeholder="Search stations" 
            placeholderTextColor="#888"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
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
          {loading ? (
            <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 40 }} />
          ) : (
            filteredStations.map(station => (
              <TouchableOpacity key={station.id} style={styles.stationRow} onPress={() => playStation(station)}>
                <View style={[styles.stationLogo, { backgroundColor: '#FFF', overflow: 'hidden' }]}>
                   <Image source={{ uri: station.logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
                <View style={styles.stationDetails}>
                  <Text style={[styles.stationName, currentTrack?.id === station.id && { color: '#1DB954' }]}>{station.title}</Text>
                  <Text style={styles.stationDesc}>{station.desc}</Text>
                </View>
                <TouchableOpacity style={{ marginRight: 16 }}>
                  <Ionicons name="heart-outline" size={24} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.listPlayBtn} onPress={() => playStation(station)}>
                  <Ionicons name={currentTrack?.id === station.id && isPlaying ? "pause" : "play"} size={16} color="#000" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
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
  recentText: { color: '#FFF', fontSize: 12, textAlign: 'center' },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', marginHorizontal: 16, marginTop: 24, borderRadius: 8, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: '#FFF', marginLeft: 8, fontSize: 15 },
  
  categoriesScroll: { paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', marginRight: 8 },
  categoryPillActive: { backgroundColor: '#1DB954' },
  categoryText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  categoryTextActive: { color: '#000' },
  
  listContainer: { paddingHorizontal: 16, paddingBottom: 40, marginTop: 10 },
  stationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stationLogo: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  stationDetails: { flex: 1 },
  stationName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  stationDesc: { color: '#aaa', fontSize: 13, marginTop: 4 },
  listPlayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
});
