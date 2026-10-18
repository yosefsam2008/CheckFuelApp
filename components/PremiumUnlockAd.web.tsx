// components/PremiumUnlockAd.web.tsx

import React, { useEffect } from 'react';

interface PremiumUnlockAdProps {
  onRewardEarned?: () => void;
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const PremiumUnlockAd: React.FC<PremiumUnlockAdProps> = ({
  onRewardEarned,
  onAdComplete,
  onAdError, // לא בשימוש ב-web כי אין שגיאות פרסומת, אבל נשמר כדי לשמור על תאימות ה-Props
}) => {
  useEffect(() => {
    // בסביבת Web אין תמיכה ב-AdMob.
    // לכן, אנחנו פשוט מדלגים על הפרסומת וקוראים לפונקציות ההצלחה מיד.
    console.log('🌐 Web Environment Detected - Unlocking Premium Instantly');
    
    // קריאה לפונקציות שמשחררות את התוכן/התגמול
    if (onRewardEarned) onRewardEarned();
    if (onAdComplete) onAdComplete();
    
  }, [onRewardEarned, onAdComplete]);

  // אין צורך להציג את מסך הטעינה או הפרסומת ב-Web
  return null;
};

export default PremiumUnlockAd;