// components/BannerAd.tsx
import React, { useState } from 'react';
import { View, Platform, StyleSheet, Text, ViewStyle } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Automatic selection between test and production IDs
const AD_UNIT_ID = __DEV__ 
  ? TestIds.BANNER 
  : 'ca-app-pub-6526080198496101/4914580281';

interface AdBannerProps {
  style?: ViewStyle;
  size?: any; // e.g. BannerAdSize.ANCHORED_ADAPTIVE_BANNER or BannerAdSize.MEDIUM_RECTANGLE
}

export default function AdBanner({ style, size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER }: AdBannerProps) {
  const [adLoaded, setAdLoaded] = useState(false);

  // Skip elegantly on web to avoid crashes
  if (Platform.OS === 'web') {
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
    >
      <Text style={styles.adLabel}>ממומן</Text>    
      
      <BannerAd
        unitId={AD_UNIT_ID}
        size={resolvedSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // Keeps user privacy
        }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.log('❌ Banner Ad failed to load: ', error);
        }}
      />
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