// components/PremiumUnlockAd.tsx

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
  // שים כאן את המזהה האמיתי שלך לפרסומת הפרימיום כשתהיה מוכן
  : 'ca-app-pub-6526080198496101/2899491732';

interface PremiumUnlockAdProps {
  onRewardEarned?: () => void;
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const PremiumUnlockAd: React.FC<PremiumUnlockAdProps> = ({
  onRewardEarned,
  onAdComplete,
  onAdError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ב-Web אנחנו מדלגים ישר להצלחה כי אין תמיכה ב-AdMob
    if (Platform.OS === 'web') {
      onRewardEarned?.();
      onAdComplete?.();
      return;
    }

    const rewardedInterstitial = RewardedInterstitialAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    // מנגנון הגנה: אם הפרסומת לא נטענה תוך 8 שניות, נפתח את הנתונים בכל מקרה
    timeoutRef.current = setTimeout(() => {
      console.log('⏳ Ad Load Timeout - Unlocking anyway');
      setIsLoading(false);
      onAdComplete?.(); 
    }, 8000);

    const unsubscribeLoaded = rewardedInterstitial.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        console.log('✅ Premium Ad Loaded');
        setIsLoading(false);
        rewardedInterstitial.show();
      }
    );

    const unsubscribeEarned = rewardedInterstitial.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        console.log('🎁 Premium Reward Earned');
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
        onAdComplete?.(); // ממשיכים ופותחים גם אם יש שגיאה
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
        <ActivityIndicator size="large" color="#34C759" />
        <Text style={styles.title}>פותח נתונים מתקדמים 🚀</Text>
        <Text style={styles.subtitle}>מיד בסיום הסרטון התוצאות ייפתחו</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(242, 242, 247, 0.9)', // רקע בהיר ויוקרתי יותר למחשבון
    justifyContent: 'center', alignItems: 'center', zIndex: 9999,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    alignItems: 'center', maxWidth: 320, marginHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  title: { color: '#1f2937', fontSize: 20, fontWeight: '700', marginTop: 20, writingDirection: 'rtl' },
  subtitle: { color: '#6b7280', fontSize: 14, marginTop: 8, textAlign: 'center', writingDirection: 'rtl' },
});

export default PremiumUnlockAd;