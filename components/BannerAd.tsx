// components/BannerAd.tsx
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useAdsAllowed } from '../lib/ads/initAds';

// Automatic selection between test and production IDs per platform
const AD_UNIT_ID = __DEV__ 
  ? TestIds.BANNER 
  : Platform.OS === 'ios'
    ? 'ca-app-pub-6526080198496101/5290907587' // המזהה החדש של iOS
    : 'ca-app-pub-6526080198496101/4914580281'; // המזהה של אנדרואיד

interface AdBannerProps {
  style?: ViewStyle;
  size?: any; // e.g. BannerAdSize.ANCHORED_ADAPTIVE_BANNER or BannerAdSize.MEDIUM_RECTANGLE
}

export default function AdBanner({ style, size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER }: AdBannerProps) {
  const [adLoaded, setAdLoaded] = useState(false);
  const allowed = useAdsAllowed();
  // the native AdView is heavy to create: mounting it with the screen made each tab's first open stutter.
  // The slot below already reserves its height, so the late mount does not move anything.
  // shortcut: a fixed delay, not tied to the transition; switch to requestIdleCallback if it proves unreliable
  const [ready, setReady] = useState(false);
  // adaptive banners default to the full device width and overflow the card; size them to the slot instead
  const [slotWidth, setSlotWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  // FIXED: Skip elegantly on web and add explicit check for BannerAd component availability
  if (Platform.OS === 'web' || !allowed) {
    return null;
  }

  // Guard against missing BannerAd component (can happen in Expo Go or build issues)
  if (typeof BannerAd === 'undefined') {
    console.warn('⚠️ BannerAd component not available on this platform');
    return null;
  }

  // Normalize size strings to correct AdMob constants and pre-calculate reserved height
  let reservedHeight = 60; // Standard adaptive banner fallback
  let resolvedSize = size;

  if (size === BannerAdSize.MEDIUM_RECTANGLE || size === 'MEDIUM_RECTANGLE' || size === 'mediumRectangle') {
    reservedHeight = 250;
    resolvedSize = BannerAdSize.MEDIUM_RECTANGLE;
  } else if (size === BannerAdSize.BANNER || size === 'BANNER' || size === 'banner') {
    reservedHeight = 50;
    resolvedSize = BannerAdSize.BANNER;
  } else {
    resolvedSize = BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
  }

  return (
    <View 
      style={[
        styles.adContainer, 
        { minHeight: reservedHeight + 24 }, // Reserve slot height + padding vertical
        style
      ]}
      onLayout={(e) => setSlotWidth(Math.floor(e.nativeEvent.layout.width) - 2)} // minus the 1px border each side
    >
      <Text style={styles.adLabel}>ממומן</Text>    
      
      {ready && slotWidth > 0 && <BannerAd
        unitId={AD_UNIT_ID}
        size={resolvedSize}
        width={resolvedSize === BannerAdSize.ANCHORED_ADAPTIVE_BANNER ? slotWidth : undefined}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // Keeps user privacy
        }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.log('❌ Banner Ad failed to load: ', error);
        }}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    backgroundColor: '#FAFAFA', // Subtle background contrast
    borderColor: '#E5E7EB',     // Sleek subtle border
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  adLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 4,
    writingDirection: 'rtl',
  },
});