// components/VehicleRewardedAd.tsx

import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View, Text, StyleSheet } from 'react-native';

interface VehicleRewardedAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const VehicleRewardedAd: React.FC<VehicleRewardedAdProps> = ({
  onAdComplete,
  onAdError
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      onAdComplete?.();
      return;
    }
    loadAndShowAd();
  }, []);

  const loadAndShowAd = async () => {
    try {
      const { RewardedInterstitialAd, AdEventType } = require('react-native-google-mobile-ads');

      const AD_UNIT_ID = __DEV__
        ? 'ca-app-pub-3940256099942544/5354046379' // Test rewarded interstitial
        : 'ca-app-pub-6395480022343350/4460223754'; // Production rewarded interstitial

      const rewardedInterstitialAd = RewardedInterstitialAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: false,
      });

      const unsubscribeLoaded = rewardedInterstitialAd.addAdEventListener(
        AdEventType.LOADED,
        () => {
          if (__DEV__) {
            console.log('✅ Vehicle Rewarded Interstitial Ad loaded');
          }
          // Keep loading screen visible while ad is showing
          rewardedInterstitialAd.show();
        }
      );

      const unsubscribeEarned = rewardedInterstitialAd.addAdEventListener(
        AdEventType.EARNED_REWARD,
        (reward: any) => {
          if (__DEV__) {
            console.log('🎁 User earned vehicle reward:', reward);
          }
        }
      );

      const unsubscribeClosed = rewardedInterstitialAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          if (__DEV__) {
            console.log('📴 Vehicle Rewarded Interstitial Ad closed');
          }
          setIsLoading(false);
          onAdComplete?.();
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          unsubscribeError();
        }
      );

      const unsubscribeError = rewardedInterstitialAd.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.error('❌ Vehicle Rewarded Interstitial Ad error:', error);
          setIsLoading(false);
          onAdError?.(error);
          onAdComplete?.(); // Continue anyway on error
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          unsubscribeError();
        }
      );

      rewardedInterstitialAd.load();

    } catch (error) {
      console.error('Failed to load ad module:', error);
      setIsLoading(false);
      onAdComplete?.(); // Continue anyway if ad module fails
    }
  };

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#009688" />
        <Text style={styles.loadingTitle}>טוען פרסומת...</Text>
        <Text style={styles.loadingSubtext}>זה ייקח רק 5-15 שניות</Text>
        <Text style={styles.loadingReward}>🎁 הוסף רכב נוסף בחינם!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  loadingTitle: {
    color: '#1f2937',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingReward: {
    color: '#009688',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default VehicleRewardedAd;
