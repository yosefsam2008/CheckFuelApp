// components/VideoAd.tsx
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface VideoAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

// This component will work only on native builds (iOS/Android)
// For development/web, it will just call onAdComplete immediately
const VideoAd: React.FC<VideoAdProps> = ({ onAdComplete, onAdError }) => {
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, skip the ad
      console.log('VideoAd: Skipping ad on web');
      onAdComplete?.();
      return;
    }

    // Try to load the ad module
    loadAndShowAd();
  }, []);

  const loadAndShowAd = async () => {
    try {
      // Dynamic import to avoid loading on web
      const admob = await import('react-native-google-mobile-ads') as any;
      const { RewardedInterstitialAd, TestIds, AdEventType } = admob;

      // Create ad instance
      const rewardedInterstitial = RewardedInterstitialAd.createForAdRequest(
        TestIds.REWARDED_INTERSTITIAL,
        {
          requestNonPersonalizedAdsOnly: true,
        }
      );

      // Set up event listeners
      const unsubscribeLoaded = rewardedInterstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('VideoAd: Ad loaded');
          setAdLoaded(true);
          // Show the ad immediately when loaded
          rewardedInterstitial.show();
        }
      );

      const unsubscribeEarned = rewardedInterstitial.addAdEventListener(
        AdEventType.EARNED_REWARD,
        (reward: any) => {
          console.log('VideoAd: User earned reward', reward);
        }
      );

      const unsubscribeClosed = rewardedInterstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('VideoAd: Ad closed');
          onAdComplete?.();
          // Clean up listeners
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          unsubscribeError();
        }
      );

      const unsubscribeError = rewardedInterstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.log('VideoAd: Ad error', error);
          onAdError?.(error);
          onAdComplete?.(); // Continue even if ad fails
          // Clean up listeners
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          unsubscribeError();
        }
      );

      // Load the ad
      rewardedInterstitial.load();

    } catch (error) {
      console.log('VideoAd: Failed to load ad module', error);
      // If module not available (Expo Go), just continue
      onAdComplete?.();
    }
  };

  // This component doesn't render anything
  return null;
};

export default VideoAd;