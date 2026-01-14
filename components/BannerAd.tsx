// app/components/BannerAd.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { useAdTracking } from '../hooks/useAdTracking';

interface AdBannerProps {
  style?: ViewStyle;
}

const AdBanner = ({ style }: AdBannerProps) => {
  const { trackImpression } = useAdTracking();
  const [adComponents, setAdComponents] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Dynamic import only on native
      import('react-native-google-mobile-ads').then((admob) => {
        setAdComponents({
          BannerAd: admob.BannerAd,
          BannerAdSize: admob.BannerAdSize,
          TestIds: admob.TestIds,
        });
      });
    }
  }, []);

  // ב-Web לא מציגים כלום
  if (Platform.OS === 'web' || !adComponents) {
    return null;
  }

  const { BannerAd, BannerAdSize, TestIds } = adComponents;

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
          console.error('❌ Banner ad failed:', error);
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