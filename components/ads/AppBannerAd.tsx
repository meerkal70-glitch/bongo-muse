// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (Platform.OS !== 'web') {
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  TestIds = admob.TestIds;
}

export default function AppBannerAd() {
  if (Platform.OS === 'web' || !BannerAd) {
    return (
      <View style={[styles.container, { height: 50, backgroundColor: '#222' }]}>
        <Text style={{ color: '#888', fontSize: 12 }}>Ad Space (Disabled on Web)</Text>
      </View>
    );
  }

  const adUnitId = __DEV__ ? TestIds.BANNER : (Platform.OS === 'ios' ? 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy' : 'ca-app-pub-xxxxxxxxxxxxx/zzzzzzzzzz'); // Replace with real ID later

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 4,
    backgroundColor: 'transparent',
