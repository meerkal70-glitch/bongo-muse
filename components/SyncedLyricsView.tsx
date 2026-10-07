import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LyricLine = ({ text, isActive, isNext, isPrev, COLORS, fontSize = 22 }: { text: string, isActive: boolean, isNext: boolean, isPrev: boolean, COLORS: any, fontSize?: number }) => {
  const anim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    let target = 0;
    if (isActive) target = 1;
    else if (isNext || isPrev) target = 0.4;

    Animated.timing(anim, {
      toValue: target,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [isActive, isNext, isPrev]);

  const scale = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.94, 0.97, 1.06]
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.32, 0.55, 1]
  });

  return (
    <Animated.Text
      style={{
        color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
        fontSize: isActive ? fontSize * 1.1 : fontSize,
        lineHeight: Math.round(fontSize * 1.4),
        fontWeight: isActive ? '900' : '600',
        textAlign: 'left',
        opacity,
        transform: [{ scale }],
        textShadowColor: isActive ? 'rgba(0,0,0,0.6)' : 'transparent',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      }}
    >
      {text || '♪'}
    </Animated.Text>
  );
};

export const SyncedLyricsView = ({ lines, activeIndex, COLORS, visible, onSeek, fontSize = 22, style }: {
  lines: { time: number; text: string }[];
  activeIndex: number;
  COLORS: any;
  visible: boolean;
  onSeek?: (seconds: number) => void;
  fontSize?: number;
  style?: any;
}) => {
  const [viewportH, setViewportH] = useState(0);
  const [lineLayouts, setLineLayouts] = useState<{ [key: number]: number }>({});
  const translateY = useRef(new Animated.Value(0)).current;
  const shownIndex = Math.max(0, Math.min(activeIndex, lines.length - 1));

  useEffect(() => {
    if (viewportH === 0 || Object.keys(lineLayouts).length === 0) return;
    
    // Calculate the Y position to perfectly center the active line
    const lineY = lineLayouts[shownIndex] || 0;
    const targetY = (viewportH / 2) - lineY - 30; // 30 is approx half of the active line height

    Animated.spring(translateY, {
      toValue: targetY,
      friction: 9,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [shownIndex, lineLayouts, viewportH]);

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]} onLayout={e => setViewportH(e.nativeEvent.layout.height)}>
      {viewportH > 0 && (
        <Animated.View style={{ transform: [{ translateY }], paddingHorizontal: 32 }}>
          {lines.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.6}
              disabled={!onSeek}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setLineLayouts(prev => ({ ...prev, [index]: y }));
              }}
              onPress={() => {
                onSeek?.(item.time / 1000);
              }}
              style={{ paddingVertical: 14 }}
            >
              <LyricLine
                text={item.text}
                isActive={index === shownIndex}
                isNext={index === shownIndex + 1}
                isPrev={index === shownIndex - 1}
                COLORS={COLORS}
                fontSize={fontSize}
              />
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
};
