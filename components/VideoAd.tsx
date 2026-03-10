// components/VideoAd.tsx

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const REWARDED_INTERSTITIAL_ID = 'ca-app-pub-6395480022343350/4460223754';

interface VideoAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
  requireReward?: boolean;
}

const VideoAd: React.FC<VideoAdProps> = ({
  onAdComplete,
  onAdError,
  requireReward = false,
}) => {
  const unsubscribersRef = useRef<(() => void)[]>([]);
  const rewardEarnedRef = useRef(false);
  const mountedRef = useRef(true);

  const cleanup = () => {
    unsubscribersRef.current.forEach(fn => fn());
    unsubscribersRef.current = [];
  };

  const safeComplete = () => {
    if (mountedRef.current) onAdComplete?.();
  };

  const safeError = (error: any) => {
    if (mountedRef.current) onAdError?.(error);
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('VideoAd: Skipping ad on web');
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
      const admob = await import('react-native-google-mobile-ads') as any;
      const { RewardedInterstitialAd, TestIds, AdEventType } = admob;

      const adUnitId = __DEV__
        ? TestIds.REWARDED_INTERSTITIAL
        : REWARDED_INTERSTITIAL_ID;

      const ad = RewardedInterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubLoaded = ad.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('VideoAd: Ad loaded');
          ad.show();
        }
      );

      const unsubEarned = ad.addAdEventListener(
        AdEventType.EARNED_REWARD,
        (reward: any) => {
          console.log('VideoAd: Reward earned', reward);
          rewardEarnedRef.current = true;
        }
      );

      const unsubClosed = ad.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('VideoAd: Ad closed');
          if (requireReward && !rewardEarnedRef.current) {
            safeError(new Error('Ad closed before reward was earned'));
          } else {
            safeComplete();
          }
          cleanup();
        }
      );

      const unsubError = ad.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.log('VideoAd: Ad error', error);
          safeError(error);
          safeComplete();
          cleanup();
        }
      );

      unsubscribersRef.current = [unsubLoaded, unsubEarned, unsubClosed, unsubError];

      ad.load();

    } catch (error) {
      console.log('VideoAd: Module unavailable (Expo Go?)', error);
      onAdComplete?.();
    }
  };

  return null;
};

export default VideoAd;