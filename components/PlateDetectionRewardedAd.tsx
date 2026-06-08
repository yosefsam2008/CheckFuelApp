// components/PlateDetectionRewardedAd.tsx
// קומפוננטה זו אחראית על הצגת פרסומת מסוג RewardedAd לפני זיהוי לוחית הרישוי.
import React, { useEffect, useState, useRef } from 'react';
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

// בחירת מזהה פרסומת חכמה לפי סביבת פיתוח ופלטפורמה (iOS / Android)
const AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED // שימוש במזהה טסטים בסביבת פיתוח
  : Platform.OS === 'ios'
    ? 'ca-app-pub-6526080198496101/2529012875' // המזהה החדש של iOS
    : 'ca-app-pub-6526080198496101/8151818415'; // המזהה הקיים של אנדרואיד

const PlateDetectionRewardedAd: React.FC<PlateDetectionRewardedAdProps> = ({
  onAdComplete,
  onAdError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true); // מעקב אחרי מחזור החיים של הקומפוננטה

  useEffect(() => {
    isMountedRef.current = true;
    let rewardedAd: any = null;
    const unsubscribers: Array<() => void> = [];

    // דילוג על פרסומות בסביבת Web
    if (Platform.OS === 'web') {
      onAdComplete?.();
      return;
    }

    const setupAd = () => {
      // יצירת מופע הפרסומת
      rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      // הרשמה למאזינים
      const unsubscribeLoaded = rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          if (!isMountedRef.current) return; // מניעת הפעלה אם הקומפוננטה הוסרה
          console.log('✅ Ad Loaded');
          setIsLoading(false);
          rewardedAd.show();
        }
      );

      // תיקון TypeScript: הוספת סוג Error
      const unsubscribeError = rewardedAd.addAdEventListener(
        AdEventType.ERROR,
        (error: Error) => {
          if (!isMountedRef.current) return; // מניעת הפעלה אם הקומפוננטה הוסרה
          console.log('❌ Ad Error:', error.message);
          setIsLoading(false);
          onAdError?.(error);
          onAdComplete?.(); // ממשיכים הלאה כדי לא לתקוע את המשתמש
        }
      );

      const unsubscribeClosed = rewardedAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          if (!isMountedRef.current) return; // מניעת הפעלה אם הקומפוננטה הוסרה
          console.log('📴 Ad Closed');
          onAdComplete?.();
        }
      );

      // תיקון TypeScript: הוספת סוג any
      const unsubscribeEarned = rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          if (!isMountedRef.current) return; // מניעת הפעלה אם הקומפוננטה הוסרה
          console.log('🎁 Reward Earned:', reward);
        }
      );

      unsubscribers.push(unsubscribeLoaded, unsubscribeError, unsubscribeClosed, unsubscribeEarned);

      // טעינת הפרסומת
      try {
        rewardedAd.load();
      } catch (error) {
        console.error('Fatal error in ad loading:', error);
        if (isMountedRef.current) {
          setIsLoading(false);
          onAdComplete?.();
        }
      }
    };

    setupAd();

    // פונקציית ניקוי - React תקרא לה אוטומטית כשהקומפוננטה יורדת מהמסך
    return () => {
      isMountedRef.current = false; // סימון שהקומפוננטה הוסרה
      unsubscribers.forEach(unsubscribe => unsubscribe()); // ניקוי כל המאזינים
    };
  }, [onAdComplete, onAdError]); 

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