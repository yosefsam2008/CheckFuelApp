import React, { useEffect } from 'react';
import { Platform } from 'react-native';

interface VideoAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: Error) => void;
}

// This component will work only on native builds (iOS/Android)
// For development/web, it will just call onAdComplete immediately
const VideoAd: React.FC<VideoAdProps> = ({ onAdComplete, onAdError }) => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, skip the ad
if (__DEV__) console.log('VideoAd: Skipping ad on web');
      onAdComplete?.();
      return;
    }

    // Try to load the ad module
    loadAndShowAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAndShowAd = async () => {
    try {
      // Dynamic import to avoid loading on web
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RewardedInterstitialAd, AdEventType } = require('react-native-google-mobile-ads');

      // Use your production AdMob ad unit ID
      // For testing, you can use TestIds.REWARDED_INTERSTITIAL
      // For production, use: 'ca-app-pub-6395480022343350/3839770059'
      const AD_UNIT_ID = __DEV__ 
        ? 'ca-app-pub-3940256099942544/5224354917' // Test ad unit for development
        : 'ca-app-pub-6395480022343350/3839770059'; // Your production ad unit

      // Create ad instance
      const rewardedInterstitial = RewardedInterstitialAd.createForAdRequest(
        AD_UNIT_ID,
        {
          requestNonPersonalizedAdsOnly: true,
        }
      );

      // Set up event listeners
      const unsubscribeLoaded = rewardedInterstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          if (__DEV__) {
            console.log('VideoAd: Ad loaded successfully');
          }
          // Show the ad immediately when loaded
          rewardedInterstitial.show();
        }
      );

      const unsubscribeEarned = rewardedInterstitial.addAdEventListener(
        AdEventType.EARNED_REWARD,
        (reward: any) => {
         if (__DEV__) console.log('VideoAd: User earned reward', reward);
          // User completed watching the ad and earned the reward
        }
      );

      const unsubscribeClosed = rewardedInterstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          if (__DEV__) console.log('VideoAd: Ad closed');
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
          console.error('VideoAd: Ad error', error);
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
      if (__DEV__) {
        console.log('VideoAd: Loading ad...');
      }
      rewardedInterstitial.load();

    } catch (error) {
      console.error('VideoAd: Failed to load ad module', error);
      // If module not available (Expo Go or web), just continue
      onAdComplete?.();
    }
  };

  // This component doesn't render anything
  return null;
};

export default VideoAd;