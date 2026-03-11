import React from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export default function AdBanner() {
  return (
    <View style={{ alignItems: 'center', width: '100%', marginVertical: 10 }}>
      <BannerAd
        unitId={TestIds.BANNER} // מזהה בדיקה של גוגל
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => console.log('Ad error: ', error)}
      />
    </View>
  );
}