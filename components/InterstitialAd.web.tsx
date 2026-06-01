import React, { useEffect } from 'react';

interface InterstitialAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const InterstitialAd: React.FC<InterstitialAdProps> = ({ onAdComplete }) => {
  useEffect(() => {
    // On web, skip the ad immediately
    onAdComplete?.();
  }, []);

  return null;
};

export default InterstitialAd;
