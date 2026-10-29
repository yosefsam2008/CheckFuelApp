// Contrast-checked text/fill colors live in tokens.ts (no react-native import, so scripts/contrast-check.ts runs in node).
// The calculator design tokens (colors, radius, space, shadow, Heebo) are below and are the source of truth.
export * from './tokens';

// CheckFuel calculator tokens. Original palette restored from git (commit c963f14, the COLORS object in calculator.tsx).
export const colors = {
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  subtle: '#FAFAFC',
  text: '#000000',
  textMuted: '#8E8E93',
  divider: '#E5E5EA',

  brandGreen: '#34C759',
  brandTeal: '#00C7BE',
  heroGradient: ['#34C759', '#00C7BE'] as const,
  // CTA only: a deeper green -> teal so the white label pops; the rest of the app keeps heroGradient
  ctaGradient: ['#1FA84F', '#0E9F8E'] as const,
  guideFill: '#E3F6EA',
  guideText: '#0E7A3C',
  selectedFill: '#A8E6CF',
  selectedBorder: '#34C759',
  selectedText: '#248A3D',

  infoBg: '#E8F4FF',
  infoText: '#007AFF',

  ecoText: '#1FA855',
  sportText: '#FF9500',
  warnBg: '#FFF4E5',
  warnText: '#B25E00',
  error: '#FF3B30',
  white: '#FFFFFF',

  // translucent whites / scrims
  white08: 'rgba(255,255,255,0.08)',
  white18: 'rgba(255,255,255,0.18)',
  white22: 'rgba(255,255,255,0.22)',
  white30: 'rgba(255,255,255,0.30)',
  white80: 'rgba(255,255,255,0.80)',
  white85: 'rgba(255,255,255,0.85)',
  textShadow: 'rgba(0,0,0,0.15)',
  scrim: 'rgba(0,0,0,0.45)',
  fadeBg: 'rgba(242,242,247,0)',
  greenShadow: 'rgba(52,199,89,0.40)',
};

export const radius = { card: 22, tile: 14, pill: 999, sheet: 28 };

export const space = { gutter: 16, cardGap: 16, cardPad: 20, block: 16, label: 8 };

export const shadow = {
  card: { boxShadow: '0px 6px 18px rgba(0,0,0,0.04)' },
  button: { boxShadow: '0px 2px 6px rgba(0,0,0,0.12)' },
  cta: { boxShadow: '0px 8px 16px rgba(52,199,89,0.40)' },
};

export const Heebo = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  semi: 'Heebo_600SemiBold',
  bold: 'Heebo_700Bold',
  extra: 'Heebo_800ExtraBold',
  black: 'Heebo_900Black',
};
