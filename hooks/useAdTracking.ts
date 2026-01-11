import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAdTracking = () => {
  const [impressions, setImpressions] = useState(0);

  useEffect(() => {
    loadImpressions();
  }, []);

  const loadImpressions = async () => {
    try {
      const stored = await AsyncStorage.getItem('ad_impressions');
      setImpressions(stored ? parseInt(stored, 10) : 0);
    } catch (error) {
      console.error('Failed to load ad impressions:', error);
    }
  };

  const trackImpression = async () => {
    const newCount = impressions + 1;
    setImpressions(newCount);
    try {
      await AsyncStorage.setItem('ad_impressions', String(newCount));
    } catch (error) {
      console.error('Failed to track impression:', error);
    }
  };

  return { impressions, trackImpression };
};
