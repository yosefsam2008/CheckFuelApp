// Web version of PlateDetectionRewardedAd - no AdMob support
import React, { useEffect } from 'react';

interface PlateDetectionRewardedAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: Error) => void;
}

/**
 * PlateDetectionRewardedAd component for web
 * AdMob is not supported on web, so this immediately calls onAdComplete
 */
const PlateDetectionRewardedAd: React.FC<PlateDetectionRewardedAdProps> = ({ onAdComplete }) => {
  useEffect(() => {
    // On web, skip the ad and immediately complete
    onAdComplete?.();
  }, [onAdComplete]);

  return null;
};

export default PlateDetectionRewardedAd;
