import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

let initPromise: Promise<boolean> | null = null;
let allowed = false;
const listeners = new Set<() => void>();

// True only after consent was resolved and the SDK initialised. Ad components must check it before requesting ads.
export const adsAllowed = () => allowed;

// Re-renders on change, for components (banners) mounted before init finishes.
export const useAdsAllowed = () =>
  useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), adsAllowed);

// Gathers UMP consent (shows the form when required), then initialises AdMob once. Never throws.
export function initAds(): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(false);
  initPromise ??= (async () => {
    try {
      // App isn't distributed in the EEA, so no UMP form is configured; a consent error must not block ads.
      const info = await AdsConsent.gatherConsent().catch(() => null);
      if (info && !info.canRequestAds) return false;
      await mobileAds().setRequestConfiguration({ testDeviceIdentifiers: ['EMULATOR'] });
      await mobileAds().initialize();
      allowed = true;
      listeners.forEach((cb) => cb());
      return true;
    } catch (error) {
      console.error('Ads init failed:', error);
      return false;
    }
  })();
  return initPromise;
}

// True when the user may re-open the consent form (GDPR "privacy options" entry point).
export async function privacyOptionsRequired(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const info = await AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === 'REQUIRED';
  } catch {
    return false;
  }
}

export const showPrivacyOptions = () => AdsConsent.showPrivacyOptionsForm();
