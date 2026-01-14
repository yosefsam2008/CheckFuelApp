import React, { useEffect } from 'react';

interface PlateDetectionRewardedAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const PlateDetectionRewardedAd: React.FC<PlateDetectionRewardedAdProps> = ({ onAdComplete }) => {
  useEffect(() => {
    onAdComplete?.();
  }, []);

  return null;
};

export default PlateDetectionRewardedAd;
