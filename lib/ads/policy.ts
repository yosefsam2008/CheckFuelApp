// Interstitial frequency policy (plan 2.8). The screen asks only when the user LEAVES it (tab switch / blur), never between
// "חשב" and the result and never before a result was seen. Pure functions + a tiny AsyncStorage wrapper for the persisted part.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AdState {
  calcsSinceLast: number; // persisted
  lastShownAt: number; // persisted (epoch ms)
  sessionShown: number; // this app session only
  resultSeen: boolean; // a result is on screen / was seen this session
}
export const MIN_CALCS = 3;
export const MIN_GAP_MS = 180_000;
export const MAX_PER_SESSION = 2;
const KEY = 'adState';

export const shouldShowInterstitial = (s: AdState, now: number) =>
  s.resultSeen && s.calcsSinceLast >= MIN_CALCS && now - s.lastShownAt >= MIN_GAP_MS && s.sessionShown < MAX_PER_SESSION;

export const afterCalculation = (s: AdState): AdState => ({ ...s, calcsSinceLast: s.calcsSinceLast + 1, resultSeen: true });
export const afterShown = (s: AdState, now: number): AdState => ({ ...s, calcsSinceLast: 0, lastShownAt: now, sessionShown: s.sessionShown + 1 });

export async function loadAdState(): Promise<AdState> {
  const fresh: AdState = { calcsSinceLast: 0, lastShownAt: 0, sessionShown: 0, resultSeen: false };
  try {
    const p = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    return { ...fresh, calcsSinceLast: Number(p?.calcsSinceLast) || 0, lastShownAt: Number(p?.lastShownAt) || 0 };
  } catch {
    return fresh;
  }
}
export const saveAdState = (s: AdState) =>
  AsyncStorage.setItem(KEY, JSON.stringify({ calcsSinceLast: s.calcsSinceLast, lastShownAt: s.lastShownAt })).catch(() => {});
