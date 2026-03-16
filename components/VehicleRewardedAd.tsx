// components/VehicleRewardedAd.tsx

import React, { useEffect, useRef } from 'react';
import {
  Platform,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
} from 'react-native';

const AD_UNIT_ID = __DEV__
  ? 'ca-app-pub-3940256099942544/5354046379' // Test Rewarded
  : 'ca-app-pub-6395480022343350/7745503279'; // Production Rewarded

interface VehicleRewardedAdProps {
  onRewardEarned?: () => void;
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const VehicleRewardedAd: React.FC<VehicleRewardedAdProps> = ({
  onRewardEarned,
  onAdComplete,
  onAdError,
}) => {
  const unsubscribersRef = useRef<(() => void)[]>([]);
  const mountedRef = useRef(true);
  const rewardEarnedRef = useRef(false);

  const cleanup = () => {
    unsubscribersRef.current.forEach(fn => fn());
    unsubscribersRef.current = [];
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      onAdComplete?.();
      return;
    }

    loadAndShowAd();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const loadAndShowAd = async () => {
    try {
      const googleMobileAds = await import('react-native-google-mobile-ads');

      const ad = googleMobileAds.RewardedAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubLoaded = ad.addAdEventListener(
        googleMobileAds.RewardedAdEventType.LOADED,
        () => {
          if (__DEV__) console.log('✅ Rewarded Ad loaded');
          ad.show();
        }
      );

      const unsubEarned = ad.addAdEventListener(
        googleMobileAds.RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          if (__DEV__) console.log('🎁 Reward earned:', reward);
          rewardEarnedRef.current = true;
          if (mountedRef.current) onRewardEarned?.();
        }
      );

      const unsubClosed = ad.addAdEventListener(
        googleMobileAds.AdEventType.CLOSED,
        () => {
          if (__DEV__) console.log('📴 Rewarded Ad closed');
          if (!rewardEarnedRef.current && mountedRef.current) {
            onAdError?.(new Error('Ad closed before reward was earned'));
          }
          if (mountedRef.current) onAdComplete?.();
          cleanup();
        }
      );

      unsubscribersRef.current = [unsubLoaded, unsubEarned, unsubClosed];

      ad.load();

    } catch (error) {
      console.error('Failed to load ad module:', error);
      if (mountedRef.current) onAdComplete?.();
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#009688" />
        <Text style={styles.title}>טוען פרסומת...</Text>
        <Text style={styles.subtitle}>זה ייקח רק 5–15 שניות</Text>
        <Text style={styles.reward}>🎁 הוסף רכב נוסף בחינם!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
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
  title: {
    color: '#1f2937',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  reward: {
    color: '#009688',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default VehicleRewardedAd;