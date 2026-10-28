/**
 * Design tokens. Brand colors stay as in the logo; the "Strong" shades are only for fills/text that carry
 * white text or sit on white. Verified by scripts/contrast-check.ts (npm run check:contrast).
 */
export const color = {
  brandGreen: '#34C759', // fills, icons, large type; dark text on it = 9.46:1
  brandGreenStrong: '#1E7B34', // white text on it = 5.33:1
  brandTeal: '#009688', // icons, large type (3.67:1 on white)
  brandTealStrong: '#00796B', // white text on it / teal text on white = 5.32:1
  brandBlue: '#007AFF', // icons
  link: '#0062CC', // links, buttons with white text = 5.80:1
  textPrimary: '#1C1C1E',
  textSecondary: '#6E6E73', // 5.07:1 on white, 4.54:1 on #F2F2F7
  warningFill: '#FF9500',
  warningText: '#B25000', // 5.20:1 on white
  surface: '#FFFFFF',
  background: '#F2F2F7',
  separator: '#E5E5EA',
} as const;

// Vehicle icon tile tints by fuel type (icon on fill needs 3:1, checked by scripts/contrast-check.ts)
export const fuelTint = {
  // brand palette only: gasoline green, EV teal, diesel blue
  gasolineFill: '#E3F6EA',
  gasolineIcon: '#0E7A3C',
  evFill: '#DDF5F3',
  evIcon: '#00706A',
  dieselFill: '#E6EDF6',
  dieselIcon: '#34557D',
} as const;

// Israeli license plate: a real-world object, so fixed colors in light and dark mode
export const plate = {
  fill: '#F7CB16',
  ink: '#141414',
  strip: '#1D4FA6',
  stripText: '#FFFFFF',
  focusRing: 'rgba(64,214,60,0.38)', // the V2 accent, glowing on the dark stage
} as const;
