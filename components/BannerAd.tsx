// app/components/BannerAd.tsx
import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { useAdTracking } from '../hooks/useAdTracking';

interface AdBannerProps {
  style?: ViewStyle;
}

// Don't import AdMob on web - causes build errors
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (Platform.OS !== 'web') {
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  TestIds = admob.TestIds;
}

const AdBanner = ({ style }: AdBannerProps) => {
  const { trackImpression } = useAdTracking();

  // ב-Web לא מציגים כלום
  if (Platform.OS === 'web') {
    return null;
  }

  const adUnitId = __DEV__
    ? TestIds.BANNER
    : 'ca-app-pub-6395480022343350/8414120131';

  return (
    <View style={[styles.adContainer, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          trackImpression();
          if (__DEV__) console.log('✅ Banner ad loaded');
        }}
        onAdFailedToLoad={(error: any) => {
          console.error('❌ Banner ad failed:', error); // KEEP - production debugging
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  adContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
});

export default AdBanner;