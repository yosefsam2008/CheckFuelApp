//componets/PlateDetectionRewardedAd.tsx
// קומפוננטה זו אחראית על הצגת פרסומת מסוג RewardedAd לפני זיהוי לוחית הרישוי.
import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { 
  TestIds, 
  RewardedAd, 
  RewardedAdEventType, 
  AdEventType 
} from 'react-native-google-mobile-ads';

interface PlateDetectionRewardedAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

// הגדרת מזהה הפרסומת מחוץ לקומפוננטה (מונע יצירה מחדש בכל רינדור)
const AD_UNIT_ID = __DEV__
  ? ""
  : 'ca-app-pub-6526080198496101/8151818415 ';

const PlateDetectionRewardedAd: React.FC<PlateDetectionRewardedAdProps> = ({
  onAdComplete,
  onAdError
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // דילוג על פרסומות בסביבת Web
    if (Platform.OS === 'web') {
      onAdComplete?.();
      return;
    }


    // יצירת מופע הפרסומת
    const rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    // הרשמה למאזינים
    const unsubscribeLoaded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        console.log('✅ Ad Loaded');
        setIsLoading(false);
        rewardedAd.show();
      }
    );

    const unsubscribeError = rewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.log('❌ Ad Error:', error.message);
        setIsLoading(false);
        onAdError?.(error);
        onAdComplete?.(); // ממשיכים הלאה כדי לא לתקוע את המשתמש
      }
    );

    const unsubscribeClosed = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('📴 Ad Closed');
        onAdComplete?.();
      }
    );

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('🎁 Reward Earned:', reward);
      }
    );

    // טעינת הפרסומת
    try {
      rewardedAd.load();
    } catch (error) {
      console.error('Fatal error in ad loading:', error);
      onAdComplete?.();
    }

    // פונקציית ניקוי - React תקרא לה אוטומטית כשהקומפוננטה יורדת מהמסך
    return () => {
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeClosed();
      unsubscribeEarned();
    };
  }, []); // מערך תלויות ריק מבטיח שזה ירוץ פעם אחת בטעינה

  if (!isLoading) return null;

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#009688" />
        <Text style={styles.loadingTitle}>טוען פרסומת...</Text>
        <Text style={styles.loadingSubtext}>זה ייקח רגע...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center', alignItems: 'center', zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    alignItems: 'center', maxWidth: 320, marginHorizontal: 20, elevation: 20,
  },
  loadingTitle: { color: '#1f2937', fontSize: 20, fontWeight: '700', marginTop: 20 },
  loadingSubtext: { color: '#6b7280', fontSize: 14, marginTop: 8, textAlign: 'center' },
});

export default PlateDetectionRewardedAd;