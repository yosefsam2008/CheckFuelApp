import React, { useEffect } from 'react';

interface VideoAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: any) => void;
}

const VideoAd: React.FC<VideoAdProps> = ({ onAdComplete }) => {
  useEffect(() => {
    // On web, skip the ad immediately
    onAdComplete?.();
  }, []);

  return null;
};

export default VideoAd;
