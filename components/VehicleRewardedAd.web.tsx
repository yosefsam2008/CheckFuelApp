// Web version of VehicleRewardedAd - no AdMob support
import React, { useEffect } from 'react';

interface VehicleRewardedAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: Error) => void;
}

/**
 * VehicleRewardedAd component for web
 * AdMob is not supported on web, so this immediately calls onAdComplete
 */
const VehicleRewardedAd: React.FC<VehicleRewardedAdProps> = ({ onAdComplete }) => {
  useEffect(() => {
    // On web, skip the ad and immediately complete
    onAdComplete?.();
  }, [onAdComplete]);

  return null;
};

export default VehicleRewardedAd;
