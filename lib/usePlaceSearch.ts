// Place search for the origin/destination sheet: local matches on every keystroke (no API), Google suggestions
// after a 300ms pause from 2 characters, one session token per sheet opening, rotated after every pick.
import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { autocomplete, filterLocal, isLocal, log, Place, placeDetails, placeLabel, samePlace } from './places';
import type { LatLng } from './route';

export type SearchStatus = 'idle' | 'loading' | 'ok' | 'empty' | 'offline' | 'error';

const DEBOUNCE_MS = 300;

export function usePlaceSearch(local: Place[], bias: LatLng | null) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<Place[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const token = useRef(randomUUID());
  const cache = useRef(new Map<string, Place[]>()); // per app session, keyed by the lowercased query

  useEffect(() => {
    const q = query.trim();
    const key = q.toLowerCase();
    if (q.length < 2) {
      setRemote([]);
      setStatus('idle');
      return;
    }
    const hit = cache.current.get(key);
    if (hit) {
      setRemote(hit);
      setStatus(hit.length ? 'ok' : 'empty');
      return;
    }
    setStatus('loading');
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await autocomplete(q, token.current, bias, ctrl.signal);
        cache.current.set(key, r);
        setRemote(r);
        setStatus(r.length ? 'ok' : 'empty');
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setRemote([]);
        setStatus(e instanceof TypeError ? 'offline' : 'error'); // RN's fetch throws TypeError on network failure
      }
    }, DEBOUNCE_MS);
    // a new keystroke cancels both the pending debounce and the in-flight request
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, bias]);

  const localMatches = filterLocal(local, query);
  return {
    query,
    setQuery,
    status,
    local: localMatches,
    remote: remote.filter((r) => !localMatches.some((l) => samePlace(l, r))),
    /** call when the sheet opens: fresh token and an empty field */
    start() {
      token.current = randomUUID();
      setQuery('');
    },
    /** Resolve a picked place. Recents/favorites return as-is with no API call. */
    async select(p: Place): Promise<Place> {
      if (isLocal(p)) {
        log('select: local place, no API call');
        return p;
      }
      let s = p;
      if (!s.placeId) {
        // a text-only recent from before placeIds: resolve it through autocomplete, inside the same session
        const [first] = await autocomplete(placeLabel(p), token.current, bias);
        if (!first) throw new Error('not_found');
        s = first;
      }
      const { lat, lng } = await placeDetails(s.placeId!, token.current);
      token.current = randomUUID(); // the details call closed the session
      return { ...s, lat, lng, coordsAt: Date.now() };
    },
  };
}
