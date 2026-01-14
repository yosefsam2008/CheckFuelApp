import React, { useEffect } from 'react';

interface VehicleRewardedAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const VehicleRewardedAd: React.FC<VehicleRewardedAdProps> = ({ onAdComplete }) => {
  useEffect(() => {
    onAdComplete?.();
  }, []);

  return null;
};

export default VehicleRewardedAd;
