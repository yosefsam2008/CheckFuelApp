// Web version of BannerAd - no AdMob support
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface AdBannerProps {
  style?: ViewStyle;
}

/**
 * BannerAd component for web
 * AdMob is not supported on web, so this returns an empty placeholder
 */
const AdBanner = ({ style }: AdBannerProps) => {
  // AdMob ads are not supported on web
  // Return empty view to maintain layout consistency
  return <View style={[styles.placeholder, style]} />;
};

const styles = StyleSheet.create({
  placeholder: {
    height: 0,
    width: 0,
  },
});

export default AdBanner;
