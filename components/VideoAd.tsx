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
    mountedRef.current = true;

    if (Platform.OS === 'web') {
      console.log('VideoAd: Skipping ad on web');
      safeComplete();
      return;
    }

    // העברנו את הפונקציה אל תוך ה-useEffect כדי לשמור על סקופ נקי
    const loadAndShowAd = async () => {
      try {
        const admob = await import('react-native-google-mobile-ads');
        const { RewardedInterstitialAd, TestIds, AdEventType, RewardedAdEventType } = admob;

        const adUnitId = __DEV__
          ? TestIds.REWARDED_INTERSTITIAL
          : REWARDED_INTERSTITIAL_ID;

        const ad = RewardedInterstitialAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        // תיקון: שימוש ב-RewardedAdEventType לאירועים ספציפיים (עם fallback)
        const unsubLoaded = ad.addAdEventListener(
          RewardedAdEventType?.LOADED || AdEventType.LOADED,
          () => {
            console.log('VideoAd: Ad loaded');
            ad.show();
          }
        );

        const unsubEarned = ad.addAdEventListener(
          RewardedAdEventType?.EARNED_REWARD || 'earned_reward',
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
            // הסרנו את הקריאה ל-safeComplete כדי למנוע לוגיקה כפולה וקריסות בקומפוננטת האב
            cleanup();
          }
        );

        unsubscribersRef.current = [unsubLoaded, unsubEarned, unsubClosed, unsubError];
        
        ad.load();

      } catch (error) {
        console.log('VideoAd: Module unavailable (Expo Go?)', error);
        safeComplete(); // במקרה של שגיאת ייבוא (כמו ב-Expo Go), אנחנו מעבירים את המשתמש הלאה כדי שלא ייתקע
      }
    };

    loadAndShowAd();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [onAdComplete, onAdError, requireReward]); // הוספת הפרופס למערך התלויות

  return null;
};

export default VideoAd;