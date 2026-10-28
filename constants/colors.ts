// Role-based colors for the redesigned screens (Calculator, Result, History). The one source of truth for them.
// The older screens (vehicles, add-vehicle, tab bar, sheets) still use constants/theme.ts until they are redesigned.
// The logo's own colors (gradient mark, hose blue) live only in the image assets, never here.

export const colors = {
  // surfaces
  surface: '#F3F5F1', // screen background (mist)
  surfaceRaised: '#FFFFFF', // cards, sheets, tab bar
  surfaceSunken: '#F3F5F1', // inner strips inside white cards
  surfaceInverse: '#0B1410', // the ONE dark hero card per screen, primary dark button
  surfaceInverseRaised: '#17231D', // segmented-control track and fields on dark

  // text on light
  text: '#0B1410',
  textMuted: '#5B6660', // secondary text, labels (>= 5.4:1 on mist)

  // text on dark
  textInverse: '#FFFFFF',
  textMutedInverse: '#9FB0A6', // ~8.2:1 on ink

  // lines
  line: '#E2E7E1', // card borders
  lineSubtle: '#EEF1EC', // row dividers inside cards
  lineInverse: '#1E2B24', // dividers inside the dark hero

  // brand accent
  accent: '#40D63C', // FILLS only, and the ₪ on dark. Never text on light (~1.9:1)
  accentTextLarge: '#22A321', // green text on light only at >= 24px or >= 19px bold (~3.3:1)
  accentText: '#0A7A43', // all smaller green text on light (~5.4:1 on white)
  accentTint: '#EAF9F0', // icon tile backgrounds

  // data viz
  chartBarInactive: '#506858', // unselected bars on the dark hero (~3.1:1 vs ink)
  chartBarActive: '#40D63C',

  // states
  disabled: '#DDE3DC', // disabled button fill
  danger: '#C93A3A', // error TEXT only (~5.1:1 on white, ~4.6:1 on mist)
  scrim: 'rgba(11,20,16,0.48)',

  // Not in the role table yet: kept at their current values so nothing changes on screen. Each needs a decision.
  inkFaint: '#3A4A41', // leading zeros of the rolling numbers, placeholder on dark fields
  inkBorder: '#2A3A31', // borders of fields and chips on dark, ghost route line
  inkChip: '#DCE5E0', // chip text and icons on dark
  faint: '#8FA197', // empty-vehicle icon, inactive segment sub-label
  disabledText: '#4E5953', // label on the disabled CTA
  dashed: '#C9D2CA', // dashed border of the empty vehicle card
  warn: '#B4530A', // sport mode, "your price" tag, manual-price dot, calculator error toast
  dangerOnInverse: '#FFB27A', // route error text inside the dark card (danger is ~2.6:1 on ink)
  toastError: '#FF3B30', // history error toast fill
} as const;
