import React, { useEffect } from 'react';

interface RewardedInterstitialProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const RewardedInterstitial: React.FC<RewardedInterstitialProps> = ({ onAdComplete }) => {
  useEffect(() => {
    // On web, skip the ad immediately
    onAdComplete?.();
  }, []);

  return null;
};

export default RewardedInterstitial;
