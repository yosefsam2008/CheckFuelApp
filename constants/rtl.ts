import { Platform } from 'react-native';

// Forces a left-to-right zone (numbers, layers anchored with physical left + translateX).
// Native reads the `direction` style; react-native-web only understands the `dir` attribute.
const web = Platform.OS === 'web';
export const LTR = {
  props: (web ? { dir: 'ltr' } : {}) as object,
  style: web ? undefined : ({ direction: 'ltr' } as const),
};

// web only: removes the browser focus rectangle from text inputs (native ignores the prop)
export const NO_OUTLINE = { outlineStyle: 'none', outlineWidth: 0 } as object;

export const NO_TOUCH = { pointerEvents: 'none' } as const;
