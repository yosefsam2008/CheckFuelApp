// Web version of VideoAd - no AdMob support
import React, { useEffect } from 'react';

interface VideoAdProps {
  onAdComplete?: () => void;
  onAdError?: (error: Error) => void;
}

/**
 * VideoAd component for web
 * AdMob is not supported on web, so this immediately calls onAdComplete
 */
const VideoAd: React.FC<VideoAdProps> = ({ onAdComplete }) => {
  useEffect(() => {
    // On web, skip the ad and immediately complete
    onAdComplete?.();
  }, [onAdComplete]);

  return null;
};

export default VideoAd;
