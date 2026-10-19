// components/RewardedInterstitial.tsx

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { adsAllowed } from '../lib/ads/initAds';
import {
  RewardedInterstitialAd,
  TestIds,
  AdEventType,
  RewardedAdEventType
} from 'react-native-google-mobile-ads';

// בחירת מזהה פרסומת חכמה לפי סביבת פיתוח ופלטפורמה (iOS / Android)
const AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED_INTERSTITIAL
  : Platform.OS === 'ios'
    ? 'ca-app-pub-6526080198496101/3310925745' // המזהה החדש של iOS
    : 'ca-app-pub-6526080198496101/2899491732'; // המזהה הקיים של אנדרואיד

interface RewardedInterstitialProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
  requireReward?: boolean;
}

const RewardedInterstitial: React.FC<RewardedInterstitialProps> = ({
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
    mountedRef.current = true;

    if (Platform.OS === 'web' || !adsAllowed()) {
      console.log('RewardedInterstitial: Skipping ad (web or no ad consent)');
      safeComplete();
      return;
    }

    const loadAndShowAd = async () => {
      try {
        const ad = RewardedInterstitialAd.createForAdRequest(AD_UNIT_ID, {
          requestNonPersonalizedAdsOnly: true,
        });

        const unsubLoaded = ad.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => {
            console.log('RewardedInterstitial: Ad loaded');
            ad.show();
          }
        );

        const unsubEarned = ad.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward: any) => {
            console.log('RewardedInterstitial: Reward earned', reward);
            rewardEarnedRef.current = true;
          }
        );

        const unsubClosed = ad.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            console.log('RewardedInterstitial: Ad closed');
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
            console.log('RewardedInterstitial: Ad error', error);
            safeError(error);
            cleanup();
          }
        );

        unsubscribersRef.current = [unsubLoaded, unsubEarned, unsubClosed, unsubError];
        
        ad.load();

      } catch (error) {
        console.log('RewardedInterstitial: Error:', error);
        safeComplete();
      }
    };

    loadAndShowAd();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [onAdComplete, onAdError, requireReward]);

  return null;
};

export default RewardedInterstitial;