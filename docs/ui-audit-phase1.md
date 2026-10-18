# CheckFuel UI redesign: Phase 1 audit (read-only)

Branch: `redesign/ui-overhaul`. No source code was changed. Method: static reading plus `token_lint.py` and `contrast.py` from the app-design-master skill. **Not verified:** no simulator or device was available, so nothing was seen on screen (no screenshots, no real Dynamic Type or VoiceOver pass).

Baseline: `tsc --noEmit` reports 2 pre-existing errors, both in dead code (`components/calculator/ResultsStep.tsx:51,59`). Anything new after this is mine.

## 1. Map

**Stack:** Expo SDK 54, expo-router 6, React Native 0.81, React 19, plain `StyleSheet` (no NativeWind or Tailwind), Reanimated 4 installed, AdMob. iOS + Android + web. Hebrew only; RTL is forced at runtime (`app/_layout.tsx:14-19`).

**Live routes / surfaces**
| Surface | File | Lines |
|---|---|---|
| Root stack | `app/_layout.tsx` | 61 |
| Entry redirect | `app/index.tsx`, `app/index.web.tsx` | |
| Tabs shell + hamburger side menu (tab bar hidden: `tabBar={() => null}`) | `app/(tabs)/_layout.tsx` | 161 |
| Calculator (wizard + results + ad overlays) | `app/(tabs)/calculator.tsx` | 3358 |
| History | `app/(tabs)/history.tsx` | 1238 |
| Vehicles | `app/(tabs)/vehicles.tsx` | 1291 |
| Add vehicle (manual / by plate) | `app/addVehicle.tsx`, `app/addVehicleByPlate.tsx` | 682 / 1077 |
| Legal, User guide (rendered inside the side-menu modal) | `app/LegalScreen.tsx`, `app/UserGuideScreen.tsx` | 762 / 647 |
| First-launch legal modal | `components/modals/FirstLaunchModal.tsx` | 352 |
| Ads (banner, interstitial, rewarded, premium unlock) | `components/*Ad*.tsx` | |
| Shared button | `components/ActionButton.tsx` (used by calculator only) | 127 |

`app/(tabs)/dashboard.tsx` is deleted in the working tree (unstaged); `docs/screen-audit.md` already covers why.

**Dead UI code (never imported by a live screen):** `components/ui/*` (shadcn/Radix, web-only), `components/trip/*`, `components/calculator/*`, `components/ButtonStyleGuide.tsx`, `components/haptic-tab.tsx`, themed-text/themed-view. About 2,400 lines. **Consequence:** there is no live design system to extend. All visual code lives in five 600-3,400-line screens with inline `StyleSheet`s.

## 2. Measurements (live code only, 29 files)
- **95 distinct hex colors, 420 hex literals**; 5 separate local palettes: nav shell teal `#009688` (`app/(tabs)/_layout.tsx:19`), calculator iOS-green `#34C759` (`calculator.tsx:197`), `FirstLaunchModal.tsx:16` (green), `LegalScreen.tsx:42` and `UserGuideScreen.tsx:54` (teal). `constants/theme.ts` is the unused Expo template.
- **17 distinct font sizes** (10-56); **40 uses of 10-13 px**. **17 distinct border radii** (2-70).
- **a11y:** 5 `accessibilityLabel` and 7 `accessibilityRole` across the whole app; 0 `AccessibilityInfo` / reduce-motion checks; 1 haptics call.
- **RTL:** 128 lint hits: 44 hard-coded `textAlign` left/right, 40 absolute `left:`/`right:`, 25 physical margin/padding, 11 `row-reverse`; 98 hard-coded `writingDirection: "rtl"`.
- **40 emoji lines** used as UI icons or headings (`📜 📋 🚀 📊 🔧 💰`), plus text glyphs `✓ ✕ ›` as icons.
- **Gradients/blur:** `LinearGradient` in calculator (`:596, :2044, :2113`) and UserGuide (`:386`); `BlurView` at `calculator.tsx:569`.

**Contrast (WCAG, measured with `scripts/contrast.py`)**
| Pair | Where | Ratio |
|---|---|---|
| white on `#34C759` | calculator header/buttons | **2.22:1** (needs 4.5) |
| white on `#009688` | nav, buttons | **3.67:1** |
| `#8E8E93` on `#F2F2F7` / white | calculator secondary text | **2.92 / 3.26:1** |
| `#AEAEB2` on white | calculator tertiary text | **2.21:1** |
| `#FF9500` on white | warnings | **2.20:1** |
| `#999` / `#aaa` on white | secondary text elsewhere | **2.85 / 2.32:1** |
| `#6B7280` on `#F5F7FA` | secondary text | 4.50:1 (borderline pass) |

## 3. Top 10 problems (ranked)
| # | Sev | Problem | Where | Checklist |
|---|---|---|---|---|
| 1 | Critical | **Primary brand colors fail contrast.** White-on-green headers/buttons 2.22:1; white-on-teal 3.67:1; most secondary text 2.2-3.3:1. | `calculator.tsx:197` (COLORS), `app/(tabs)/_layout.tsx:19`, `FirstLaunchModal.tsx:16` | A-01 |
| 2 | Critical | **No accessibility foundation.** 5 labels / 7 roles app-wide; icon-only controls (`✕` toast close `calculator.tsx:548`, side-menu button is the exception) unlabeled; `TouchableOpacity` without roles; no reduce-motion handling; fixed `writingDirection`. | all screens | A-04, A-05, A-10 |
| 3 | Critical | **Touch targets under 44.** Legal close button 40×40 (`LegalScreen.tsx:632`), modal handle/steps, 10-13 px labels with tight padding (40 text uses ≤ 13 px). Needs per-control confirmation on device. | `LegalScreen.tsx:632`, `calculator.tsx` step dots/toast, `history.tsx`, `vehicles.tsx` | A-03, T-02 |
| 4 | Major | **Two brand identities in one app.** Teal nav shell + legal/guide vs iOS-system-green calculator + first-launch modal; accent blue `#007AFF`, orange, red from three systems. Reads as unfinished. | see Measurements | K-01, D-01 |
| 5 | Major | **No design system; screens are monoliths.** 420 hex literals, 17 font sizes, 17 radii, 3,358-line calculator whose `StyleSheet` alone is ~1,200 lines (`:2162` onward); ~2,400 lines of unused shadcn/Radix/web components. | `calculator.tsx:2162`, `components/ui/*` | D-01, D-04, S-06 |
| 6 | Major | **Navigation is a hamburger modal on iOS.** Tab bar deliberately hidden for a one-home-screen design; side menu is a transparent `Modal` that also hosts Legal/Guide inside itself. Platform-foreign on iOS (HIG), but it is a recent product decision (see `docs/screen-audit.md`), so confirm before changing. | `app/(tabs)/_layout.tsx:20-77, 88` | N-01, H-01 |
| 7 | Major | **Dark mode is declared but unsupported.** `userInterfaceStyle: automatic` while backgrounds/text are hard-coded light (`app/_layout.tsx:53`, `_layout.tsx:sceneStyle`); on a dark-mode device the screens stay light (not verified on device). | `app.json`, `app/_layout.tsx:53`, all screens | K-03, H-15 |
| 8 | Major | **Generic/"AI" visual vocabulary.** Emoji as icons and headings (40 lines, e.g. `PremiumUnlockAd.tsx:126`, `FirstLaunchModal.tsx:121,139`), gradient headers (`calculator.tsx:596,2044,2113`), `BlurView` over content (`:569`), soft grey shadows on every card. Uniform rounded cards, no signature. | calculator, FirstLaunchModal, UserGuide | V-03, V-07, K-07 |
| 9 | Major | **RTL is hand-forced, not logical.** `forceRTL` + reload on first launch (flash/restart), 98 hard-coded `writingDirection`, 44 `textAlign` left/right, 40 absolute left/right, 11 `row-reverse`. Works today only because the app is Hebrew-only; any LTR string or reverse-flow bug double-flips. | `app/_layout.tsx:14-19`, calculator, vehicles | R-01, R-07 |
| 10 | Major | **Hierarchy and ads.** Banners, interstitial and premium-unlock blur are interleaved with the core flow (`calculator.tsx` mid-results banner `:2113`, step banners), burying the one number users came for; the results screen stacks many comparable-weight cards (needs on-screen confirmation). | `calculator.tsx:1862, 1904, 2113`, `history.tsx:392` | V-01, S-02 |

Also noted (Minor/Polish): system font only, `Fonts` constants unused (T-10); `StatusBar` handling Android-only; stray route `app/Toast.tsx` (a component inside `app/`); `Legal/Guide` registered as routes but really modals; 1 haptics call; `fontSize` 48/56 hero only in two places.

## 4. HIG CHECK (iOS/iPad, `supportsTablet: true`, `requireFullScreen: true`)
| Item | Status | Confidence |
|---|---|---|
| Navigation: hamburger modal, tab bar hidden, custom header | Major (H-01); product decision, confirm | Verified (code) |
| Dynamic Type: sizes are fixed numbers; `allowFontScaling` untouched (default scales), no `maxFontSizeMultiplier`; layouts with fixed heights likely clip at large sizes | Needs device test | Assumed |
| Safe areas: `useSafeAreaInsets` in 6 files; bottom padding hack in layout (`sceneStyle.paddingBottom`) | Mostly OK; verify sheets | Needs device test |
| SF Symbols: `@expo/vector-icons` Material icons + emoji; `expo-symbols` installed but referenced only from dead code | Minor (H-03) | Verified |
| Haptics: 1 call app-wide | Minor (H-06) | Verified |
| Dark Mode: not supported (see #7) | Major (H-15) | Verified |
| Liquid Glass: `BlurView` over content in calculator | Major if kept (H-07) | Verified (code), legibility needs device |
| Accessibility labels | Critical (H-16) | Verified |
| iPad: `supportsTablet: true` with `requireFullScreen: true` and portrait lock; layouts are phone-width; no keyboard/pointer support | Major (H-10) | Verified |
| App Store readiness | **Fix first.** Items to verify against Apple's current guidelines: ad/tracking disclosure vs. privacy text (`docs/screen-audit.md` flags AdMob omitted from privacy copy; no ATT/consent flow found), "rewarded unlock" that unlocks without reward, emoji-heavy legal copy. Not checked: Info.plist strings, privacy manifest, `app.json` plugin config. | Needs review |

Reminder: Apple guidance on Liquid Glass and App Review wording changes each OS cycle; verify time-sensitive items on developer.apple.com before relying on them.

## 5. What works (keep)
- Strong core: one clear job (what does this drive cost), fast.
- Animated cost number and clear Hebrew copy tone.
- Consistent 16/20/24 corner rhythm in many places (although 17 radii exist) and generous padding.
- `ActionButton` has three sensible variants and is the right seed for a primitive.
- RTL is already working for Hebrew users.

## 6. Open question that affects the plan
`docs/screen-audit.md` (existing, untracked) recommends changing the product structure (cut the dashboard, one home screen, merge flows). This redesign is **visual layer only**, so structure changes there are out of scope unless you say otherwise.
