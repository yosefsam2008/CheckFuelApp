// Growth: a download link in the split message, and the in-app review prompt (no "do you like us?" gate: stores forbid it).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { useEffect } from 'react';
import { AppState, Linking, Platform, Share } from 'react-native';
import { loadAdState } from './ads/policy';
import { splitMessage } from './format';

export const STORE_URL = 'https://play.google.com/store/apps/details?id=com.checkfuel.app';
const K = { firstOpen: 'cf.firstOpen', pending: 'cf.reviewPending', askedAt: 'cf.reviewAskedAt', saves: 'cf.tripsSaved' };
const DAY = 86_400_000;
const MIN_AGE = 2 * DAY; // never in the first days of use
const GAP = 90 * DAY; // the stores cap it too; this keeps us from burning the quota
const AD_QUIET = 120_000; // not right after a fullscreen ad
export const MIN_SAVES = 3;

let sessionError = false;
/** Call in a catch where a request or calculation failed: no review prompt for the rest of this session. */
export const markSessionError = () => {
  sessionError = true;
};

export const markFirstOpen = () =>
  AsyncStorage.getItem(K.firstOpen)
    .then((v) => (v ? undefined : AsyncStorage.setItem(K.firstOpen, String(Date.now()))))
    .catch(() => {});

export type SplitShare = Parameters<typeof splitMessage>[0] & { people: number };

/** The split text; the store link stays on the last line so chat apps make it tappable. */
// shortcut: no link on iOS (Apple rejects links to Google Play); add the App Store link once the app has an Apple ID.
export const buildShareMessage = (s: SplitShare) => splitMessage(s, s.people) + (Platform.OS === 'android' ? `\n${STORE_URL}` : '');

export async function shareSplit(s: SplitShare) {
  const r = await Share.share({ message: buildShareMessage(s) });
  if (r.action === Share.sharedAction) AsyncStorage.setItem(K.pending, '1').catch(() => {});
  return r;
}

const num = (v: string | null) => (v ? Number(v) || null : null);

export const reviewDue = (now: number, o: { firstOpen: number | null; askedAt: number | null; adAt: number; error: boolean }) =>
  !o.error && o.firstOpen != null && now - o.firstOpen >= MIN_AGE && (o.askedAt == null || now - o.askedAt >= GAP) && now - o.adAt >= AD_QUIET;

async function maybeAskReview() {
  try {
    const [[, first], [, asked]] = await AsyncStorage.multiGet([K.firstOpen, K.askedAt]);
    const now = Date.now();
    const { lastShownAt } = await loadAdState();
    if (!reviewDue(now, { firstOpen: num(first), askedAt: num(asked), adAt: lastShownAt, error: sessionError })) return;
    // isAvailableAsync, not hasAction: requestReview's fallback would open the store page unasked
    if (!(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(K.askedAt, String(now));
    await StoreReview.requestReview();
  } catch {}
}

/** After a trip is saved (not a duplicate). Asks from the 3rd save on, once the result sheet has closed. */
export async function onTripSaved() {
  const n = (num(await AsyncStorage.getItem(K.saves).catch(() => null)) ?? 0) + 1;
  AsyncStorage.setItem(K.saves, String(n)).catch(() => {});
  if (n >= MIN_SAVES) setTimeout(maybeAskReview, 1500);
}

/** Root layout: when the user comes back from sharing a split, ask then. */
export function useReviewAfterShare() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || (await AsyncStorage.getItem(K.pending).catch(() => null)) !== '1') return;
      await AsyncStorage.removeItem(K.pending).catch(() => {});
      setTimeout(maybeAskReview, 1000);
    });
    return () => sub.remove();
  }, []);
}

// shortcut: Android only (no App Store id yet); add the iOS itms-apps link when the app ships there.
export const openStorePage = () =>
  Linking.openURL('market://details?id=com.checkfuel.app').catch(() => Linking.openURL(STORE_URL).catch(() => {}));
