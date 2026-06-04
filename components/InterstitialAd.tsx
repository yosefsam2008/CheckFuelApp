// components/InterstitialAd.tsx

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface InterstitialAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const InterstitialAd: React.FC<InterstitialAdProps> = ({
  onAdComplete,
  onAdError,
}) => {
  const unsubscribersRef = useRef<(() => void)[]>([]);
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
      console.log('InterstitialAd: Skipping ad on web');
      safeComplete();
      return;
    }

    const loadAndShowAd = async () => {
      try {
        const admob = await import('react-native-google-mobile-ads');
        const { InterstitialAd: AdMobInterstitialAd, TestIds, AdEventType } = admob;

        // בחירה חכמה של המזהה לפי הפלטפורמה (iOS או אנדרואיד) ומצב הפיתוח
        const adUnitId = __DEV__
          ? TestIds.INTERSTITIAL
          : Platform.OS === 'ios'
            ? 'ca-app-pub-6526080198496101/4281078249' // המזהה החדש של iOS
            : 'ca-app-pub-6526080198496101/6661960899'; // המזהה הקיים של אנדרואיד

        const ad = AdMobInterstitialAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        const unsubLoaded = ad.addAdEventListener(
          AdEventType.LOADED,
          () => {
            console.log('InterstitialAd: Ad loaded');
            ad.show();
          }
        );

        const unsubClosed = ad.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            console.log('InterstitialAd: Ad closed');
            safeComplete();
            cleanup();
          }
        );

        const unsubError = ad.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            console.log('InterstitialAd: Ad error', error);
            safeError(error);
            cleanup();
          }
        );

        unsubscribersRef.current = [unsubLoaded, unsubClosed, unsubError];
        
        ad.load();

      } catch (error) {
        console.log('InterstitialAd: Module unavailable (Expo Go?)', error);
        safeComplete();
      }
    };

    loadAndShowAd();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [onAdComplete, onAdError]);

  return null;
};

export default InterstitialAd;