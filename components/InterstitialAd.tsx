// components/InterstitialAd.tsx

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { adsAllowed } from '../lib/ads/initAds';

interface InterstitialAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const LOAD_TIMEOUT_MS = 4000;

const InterstitialAd: React.FC<InterstitialAdProps> = ({
  onAdComplete,
  onAdError,
}) => {
  const unsubscribersRef = useRef<(() => void)[]>([]);
  const mountedRef = useRef(true);
  // the parent passes new callbacks on every render; reading them through refs keeps the effect from restarting
  // (a restart dropped the CLOSED listener and let the timeout open the result over a showing ad)
  const doneRef = useRef(false);
  const completeRef = useRef(onAdComplete);
  const errorRef = useRef(onAdError);
  completeRef.current = onAdComplete;
  errorRef.current = onAdError;

  const cleanup = () => {
    unsubscribersRef.current.forEach(fn => fn());
    unsubscribersRef.current = [];
  };

  const safeComplete = () => {
    if (!mountedRef.current || doneRef.current) return;
    doneRef.current = true;
    completeRef.current?.();
  };

  const safeError = (error: any) => {
    if (!mountedRef.current || doneRef.current) return;
    doneRef.current = true;
    errorRef.current?.(error);
  };

  useEffect(() => {
    mountedRef.current = true;

    if (Platform.OS === 'web' || !adsAllowed()) {
      console.log('InterstitialAd: Skipping ad (web or no ad consent)');
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

        // No ad within 4s: give up so the caller never waits on the network.
        const timer = setTimeout(() => {
          console.log('InterstitialAd: Load timeout');
          cleanup();
          safeComplete();
        }, LOAD_TIMEOUT_MS);

        const unsubLoaded = ad.addAdEventListener(
          AdEventType.LOADED,
          () => {
            clearTimeout(timer);
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

        unsubscribersRef.current = [unsubLoaded, unsubClosed, unsubError, () => clearTimeout(timer)];
        
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
    // mount-only: one ad per overlay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default InterstitialAd;