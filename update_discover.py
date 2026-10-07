import re
import sys

path = "/Users/apple/.gemini/antigravity-ide/scratch/bongomus/app/discover.tsx"
with open(path, "r") as f:
    content = f.read()

# 1. Update imports
import_synced_lyrics = "import { SyncedLyricsView } from '../components/SyncedLyricsView';\nimport { useMemo } from 'react';\n"
content = content.replace("import { GlassView } from '../components/GlassView';", import_synced_lyrics + "import { GlassView } from '../components/GlassView';")

# 2. Update TrackSlide arguments
track_slide_decl = "const TrackSlide = ({ item, height, isActive, isLoadingAudio, previewProgress, previewEnded, onReplay, onListenFull, onComment }: { item: Track, height: number, isActive: boolean, isLoadingAudio: boolean, previewProgress: number, previewEnded: boolean, onReplay: () => void, onListenFull: () => void, onComment: () => void }) => {"
new_track_slide_decl = "const TrackSlide = ({ item, height, isActive, isLoadingAudio, previewProgress, previewEnded, onReplay, onListenFull, onComment, previewElapsedMs }: { item: Track, height: number, isActive: boolean, isLoadingAudio: boolean, previewProgress: number, previewEnded: boolean, onReplay: () => void, onListenFull: () => void, onComment: () => void, previewElapsedMs: number }) => {"
content = content.replace(track_slide_decl, new_track_slide_decl)

# 3. Add lyric parsing inside TrackSlide
lyric_parsing = """
  const parsedLyrics = useMemo(() => {
    let rawLyrics = item.lyrics;
    if (!rawLyrics) return null;
    const lines = rawLyrics.split('\\n');
    const parsed = [];
    for (const line of lines) {
      const match = line.match(/^\\[(\\d{2}):(\\d{2}\\.\\d{2})\\](.*)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const text = match[3].trim();
        if (text) {
          parsed.push({ time: (min * 60 + sec) * 1000, text });
        }
      }
    }
    return parsed.length > 0 ? parsed : null;
  }, [item.lyrics]);

  const activeLyricIndex = useMemo(() => {
    if (!parsedLyrics) return -1;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (previewElapsedMs >= parsedLyrics[i].time) {
        return i;
      }
    }
    return 0;
  }, [previewElapsedMs, parsedLyrics]);

"""
content = content.replace("const [likeCount, setLikeCount] = useState(item.like_count || 0);", "const [likeCount, setLikeCount] = useState(item.like_count || 0);" + lyric_parsing)


# 4. Replace artWrap with SyncedLyricsView
art_wrap_start = content.find("{/* Featured artwork card */}")
art_wrap_end = content.find("</View>", content.find("</View>", content.find("</View>", content.find("</View>", art_wrap_start) + 1) + 1) + 1) + 7

lyrics_view = """
      {/* Full screen lyrics view */}
      <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 200 }]} pointerEvents="box-none">
        {parsedLyrics ? (
          <SyncedLyricsView
            lines={parsedLyrics}
            activeIndex={activeLyricIndex}
            COLORS={COLORS}
            visible={isActive}
            fontSize={26}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {isActive && isLoadingAudio && !previewEnded && (
              <ActivityIndicator size="large" color="#fff" />
            )}
          </View>
        )}
      </View>
"""

content = content[:art_wrap_start] + lyrics_view + content[art_wrap_end:]

# 5. Update fetchDiscoverTracks to fetch tracks with synced lyrics
fetch_old = """    const { data, error } = await supabase
      .from('tracks')
      .select('*, profile:profiles!tracks_user_id_fkey(*)')
      .eq('is_public', true)
      .limit(20);"""

fetch_new = """    const { data, error } = await supabase
      .from('tracks')
      .select('*, profile:profiles!tracks_user_id_fkey(*)')
      .eq('is_public', true)
      .not('lyrics', 'is', null)
      .ilike('lyrics', '%[%]%')
      .limit(30);"""
content = content.replace(fetch_old, fetch_new)

# 6. Pass previewElapsedMs to TrackSlide
content = content.replace("previewEnded={index === currentIndex && previewEnded}", "previewEnded={index === currentIndex && previewEnded}\n            previewElapsedMs={index === currentIndex ? previewElapsed * 1000 : 0}")

with open(path, "w") as f:
    f.write(content)

print("Done")
