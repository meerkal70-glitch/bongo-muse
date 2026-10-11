import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { usePlayerStore } from '../../store/playerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_KEY = 'bongo-radio-recent';
const RECENT_MAX = 10;
const FAV_KEY = 'bongo-radio-favorites';

const CATEGORIES = ['All', 'Favorites', 'Music', 'Gospel', 'News'];

// Stations we list by hand (not in the Radio Browser directory or missing)
const FEATURED_STATIONS = [
  { id: 'wasafi', title: 'Wasafi FM 88.9', cat: 'Music', desc: 'MP3 • 1 listening', logo: 'https://wasafimedia.co.tz/wp-content/uploads/2026/04/Wasafi-Media-Logo-favicon1-300x300.webp', streamUrl: 'https://radio.wasafimedia.co.tz/wasafi' },
];

const BONGO_AI_LOGO = RNImage.resolveAssetSource(require('../../assets/icon.png')).uri;
const BONGO_AI_STATION = { id: 'ai', title: 'Bongo AI Radio', cat: 'Music', desc: 'Non-stop AI songs made on Bongo', logo: BONGO_AI_LOGO, streamUrl: 'https://icecast.omnycontent.com/fallback' };

const gFavicon = (domain: string) =>
  `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=256`;

// Verified logos for each station, keyed by station name (lowercase, letters/numbers only)
const LOGO_OVERRIDES: Record<string, string> = {
  cloudsfm: 'https://cloudsmedia.co.tz/apple-touch-icon.png',
  radiomariatanzania: 'https://www.radiomaria.co.tz/wp-content/themes/radiomaria/apple-touch-icon.png',
  eastafricaradiofm: 'https://cdn-radiotime-logos.tunein.com/s164297q.png',
  radioonestereo: gFavicon('radio1.co.tz'),
  radiouhai: 'https://www.radiouhai.co.tz/favicon/apple-touch-icon.png',
  radiombiu: gFavicon('radiombiu.co.tz'),
  nurufm: 'https://radiotadio.co.tz/nurufm/wp-content/uploads/sites/12/2025/04/cropped-dp-250x250.jpg',
  christianfmradio: 'https://stream-tools.zenomedia.com/content/stations/2a779f8b-972f-43aa-ba67-200355116173/image/?updated=1672840389000',
  heavenfmradio: 'https://proxy.zeno.fm/content/stations/agxzfnplbm8tc3RhdHNyMgsSCkF1dGhDbGllbnQYgICIltiCmAoMCxIOU3RhdGlvblByb2ZpbGUYgICIlqiKoAgMogEEemVubw/image/?u=1769688887000',
  heavenradio: 'https://proxy.zeno.fm/content/stations/agxzfnplbm8tc3RhdHNyMgsSCkF1dGhDbGllbnQYgICIltiCmAoMCxIOU3RhdGlvblByb2ZpbGUYgICIlqiKoAgMogEEemVubw/image/?u=1769688887000',
  gloriousonlineradio: 'https://proxy.zeno.fm/content/stations/b4d65bc4-293f-469b-a04e-0934d4d84f53/image/?u=1791286474000',
  mungukwanzaradio: 'https://mungukwanza.com/wp-content/uploads/2023/12/cropped-Mungu-Kwanza-Logo.png',
  mungukwanza: 'https://mungukwanza.com/wp-content/uploads/2023/12/cropped-Mungu-Kwanza-Logo.png',
  imbanasi: gFavicon('imbanasi.com'),
  ishizwefm: 'https://cdn-profiles.tunein.com/s341007/images/logoq.png',
  radiokwizera: 'https://radiokwizera.co.tz/wp-content/uploads/2026/02/cropped-RadioKwizeraLogo.png',
  nehestratfm: 'https://cdn-profiles.tunein.com/s361473/images/logoq.png',
};

const IMAGE_RE = /\.(png|jpe?g|webp|gif)(\?|$)|gstatic\.com|googleusercontent\.com|_next\/image/i;

const pickLogo = (s: any): string => {
  const key = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (LOGO_OVERRIDES[key]) return LOGO_OVERRIDES[key];
  const fav = s.favicon || '';
  if (fav.startsWith('http') && IMAGE_RE.test(fav) && !/favicon\.ico/i.test(fav)) return fav;
  const home = s.homepage || '';
  if (home.startsWith('http') && IMAGE_RE.test(home)) return home;
  return ''; // StationLogo shows initials
};

const LOGO_COLORS = ['#1DB954', '#E91E63', '#3F51B5', '#FF9800', '#009688', '#9C27B0', '#F44336', '#00BCD4'];

const StationLogo = ({ uri, title, size }: { uri?: string; title: string; size: number }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [uri]);
  const initials = (title || '?').replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const color = LOGO_COLORS[(title || '').length % LOGO_COLORS.length];
  const circle = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' as const };
  if (!uri || failed) {
    return (
      <View style={[circle, { backgroundColor: color, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
      </View>
    );
  }
  return (
    <View style={[circle, { backgroundColor: '#FFF' }]}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={() => setFailed(true)} />
    </View>
  );
};

const GOSPEL_RE = /gospel|christian|church|religio|worship|bible|mungu|heaven|nuru|maria|kwizera|glorious|injili|praise/i;
const NEWS_RE = /news|talk|habari|tbc|parliament|sports/i;
// Islamic / Quran stations: not Music, not Gospel — they appear under "All"
const ISLAMIC_RE = /islam|quran|qur'an|ibn tv|abdulbasit|qaswida|mp3islam/i;

const categorize = (name: string, tags: string) => {
  const t = `${name} ${tags || ''}`;
  if (ISLAMIC_RE.test(t)) return 'Islamic';
  if (GOSPEL_RE.test(t)) return 'Gospel';
  if (NEWS_RE.test(t)) return 'News';
  return 'Music';
};

export default function FMRadioScreen() {
  const { COLORS } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  
  const { currentTrack, isPlaying, play, pause, resume } = usePlayerStore();
  
  const [stations, setStations] = useState<any[]>([...FEATURED_STATIONS, BONGO_AI_STATION]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recent, setRecent] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    fetchStations();
    AsyncStorage.getItem(RECENT_KEY).then(v => { if (v) setRecent(JSON.parse(v)); }).catch(() => {});
    AsyncStorage.getItem(FAV_KEY).then(v => { if (v) setFavorites(JSON.parse(v)); }).catch(() => {});
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      AsyncStorage.setItem(FAV_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const addToRecent = (station: any) => {
    setRecent(prev => {
      const item = { id: station.id, title: station.title, logo: station.logo, streamUrl: station.streamUrl, desc: station.desc, cat: station.cat };
      const next = [item, ...prev.filter(r => r.id !== station.id)].slice(0, RECENT_MAX);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const fetchStations = async () => {
    try {
      const res = await fetch('https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/TZ?hidebroken=true&order=votes&reverse=true&limit=80');
      const raw = await res.json();
      
      const seen = new Set<string>();
      const out: any[] = [...FEATURED_STATIONS];
      seen.add('wasafifm889');
      seen.add('wasafifm');
      
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
        
        const logo = pickLogo(s);
        
        out.push({
          id: s.stationuuid,
          title: (s.name || 'Unknown').trim(),
          cat: categorize(s.name || '', s.tags || ''),
          desc: `${s.codec || 'MP3'} • ${s.bitrate || 0} kbps`,
          logo,
          streamUrl: origUrl,
        });
      }
      setStations([...out, BONGO_AI_STATION]); // Bongo AI always last
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

    addToRecent(station);
    play({
      id: station.id,
      url: station.streamUrl,
      title: station.title,
      artist: 'Live Radio',
      artwork: station.logo,
    });
  };

  // Play button: pause if this station is playing, resume if paused, otherwise start it
  const toggleStation = (station: any) => {
    if (currentTrack?.id === station.id) {
      if (isPlaying) pause(); else resume();
    } else {
      playStation(station);
    }
  };

  const filteredStations = stations.filter(s => {
    if (activeCategory === 'Favorites') {
      if (!favorites.includes(s.id)) return false;
    } else if (activeCategory !== 'All' && s.cat !== activeCategory) {
      return false;
    }
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Recently Played */}
        {recent.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recently played</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
              {recent.map(r => (
                <TouchableOpacity key={r.id} style={styles.recentItem} onPress={() => toggleStation(r)}>
                  <View style={[styles.recentCircle, currentTrack?.id === r.id && styles.recentCircleActive]}>
                    <StationLogo uri={r.logo} title={r.title} size={64} />
                  </View>
                  <Text style={[styles.recentText, currentTrack?.id === r.id && { color: '#1DB954' }]} numberOfLines={1}>{r.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

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
          ) : filteredStations.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 24 }}>
              <Ionicons name={activeCategory === 'Favorites' ? 'heart-outline' : 'radio-outline'} size={40} color="#555" />
              <Text style={{ color: '#aaa', fontSize: 15, textAlign: 'center', marginTop: 12 }}>
                {searchQuery
                  ? `No stations match "${searchQuery}"`
                  : activeCategory === 'Favorites'
                    ? 'No favorites yet. Tap the heart on a station to add it here.'
                    : `No ${activeCategory} stations right now.`}
              </Text>
            </View>
          ) : (
            filteredStations.map(station => (
              <TouchableOpacity key={station.id} style={styles.stationRow} onPress={() => playStation(station)}>
                <View style={styles.stationLogo}>
                  <StationLogo uri={station.logo} title={station.title} size={50} />
                </View>
                <View style={styles.stationDetails}>
                  <Text style={[styles.stationName, currentTrack?.id === station.id && { color: '#1DB954' }]}>{station.title}</Text>
                  <Text style={styles.stationDesc}>{station.desc}</Text>
                </View>
                <TouchableOpacity style={{ marginRight: 16 }} onPress={() => toggleFavorite(station.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={favorites.includes(station.id) ? 'heart' : 'heart-outline'} size={24} color={favorites.includes(station.id) ? '#1DB954' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.listPlayBtn} onPress={() => toggleStation(station)}>
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
  recentItem: { width: 72, alignItems: 'center' },
  recentCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  recentCircleActive: { borderColor: '#1DB954' },
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
  stationLogo: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  stationDetails: { flex: 1 },
  stationName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  stationDesc: { color: '#aaa', fontSize: 13, marginTop: 4 },
  listPlayBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
});
