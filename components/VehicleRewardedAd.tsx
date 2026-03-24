import React, { useEffect, useState, useRef } from 'react';
import {
  Platform,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {
  TestIds,
  RewardedInterstitialAd,
  RewardedAdEventType,
  AdEventType
} from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED_INTERSTITIAL 
  : 'ca-app-pub-6526080198496101/2899491732';

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
  const [isLoading, setIsLoading] = useState(true);
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') {
      onRewardEarned?.();
      onAdComplete?.();
      return;
    }

    const rewardedInterstitial = RewardedInterstitialAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    // מנגנון הגנה: אם הפרסומת לא נטענה תוך 8 שניות, נמשיך הלאה
    timeoutRef.current = setTimeout(() => {
      console.log('⏳ Ad Load Timeout - Continuing to save');
      setIsLoading(false);
      onAdComplete?.(); 
    }, 8000);

    const unsubscribeLoaded = rewardedInterstitial.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        console.log('✅ Ad Loaded');
        setIsLoading(false);
        rewardedInterstitial.show();
      }
    );

    const unsubscribeEarned = rewardedInterstitial.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        console.log('🎁 Reward Earned');
        onRewardEarned?.();
      }
    );

    const unsubscribeError = rewardedInterstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        console.log('❌ Ad Error:', error.message);
        setIsLoading(false);
        onAdError?.(error);
        onAdComplete?.(); // ממשיכים בשמירה גם אם יש שגיאה
      }
    );

    const unsubscribeClosed = rewardedInterstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        onAdComplete?.();
      }
    );

    try {
      rewardedInterstitial.load();
    } catch (error) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onAdComplete?.();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeError();
      unsubscribeClosed();
    };
  }, []);

  if (!isLoading) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#009688" />
        <Text style={styles.title}>מכין פרסומת...</Text>
        <Text style={styles.subtitle}>מיד נשמור את הרכב</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', zIndex: 9999,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    alignItems: 'center', maxWidth: 320, marginHorizontal: 20,
  },
  title: { color: '#1f2937', fontSize: 20, fontWeight: '700', marginTop: 20 },
  subtitle: { color: '#6b7280', fontSize: 14, marginTop: 8 },
});

export default VehicleRewardedAd;