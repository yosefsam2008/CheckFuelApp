// Mock for web platform - prevents import errors
export default () => ({
  initialize: () => Promise.resolve([]),
  setRequestConfiguration: () => {},
});

export const BannerAd = () => null;
export const BannerAdSize = {};
export const TestIds = { BANNER: 'test-banner' };
export const AdEventType = {};
export const AdsConsent = {};
export const AdsConsentDebugGeography = {};
export const AdsConsentStatus = {};
export const MaxAdContentRating = {};
