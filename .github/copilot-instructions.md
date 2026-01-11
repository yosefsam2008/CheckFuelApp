# CheckFuel Copilot Instructions

## Project Overview

**CheckFuel** is a multi-platform fuel economy and cost calculator app (Expo/React Native for iOS/Android/Web). It tracks vehicle fuel consumption, calculates trip costs, and integrates real-time fuel price data via a mock Express server and external API (fueleconomy.gov).

**Key Tech Stack:**
- **Frontend:** Expo Router (v6), React Native, TypeScript
- **State/Storage:** AsyncStorage (local persistence)
- **UI:** Radix UI components, Tailwind CSS (web), custom themed components
- **APIs:** FuelEconomy.gov (vehicle data), Express mock server (fuel prices)
- **Deployment:** Vercel (serverless functions), Platform-agnostic builds

---

## Architecture & Data Flow

### Core Data Models

1. **Vehicle** (`app/vehiclesData.ts`)
   - `id`, `plate`, `name`, `model`, `engine`, `type`, `fueltype`, `avgConsumption`, `year`
   - Persisted to AsyncStorage at key `"vehicles"` (JSON array)
   - Loaded on app startup via tab screens

2. **Trip/FuelRecord** (`types/trip.ts`)
   - Records: `id`, `date`, `distance`, `vehicleName`, `totalCost`, `fuelConsumed`, `consumption`, `energyType` ("fuel" | "electricity")
   - Stored in AsyncStorage (implied from `history.tsx` usage)

3. **FuelEconomyResult** (`app/fuelData.ts`)
   - Unified metric: `combinedEnergyPer100Km` (works for gas/EV)
   - Gas vehicles: `combinedKmPerL`, `combinedMPG`
   - EVs: `combinedKwhPer100Km`, `range`, `kmPerBatteryPercent`
   - Fetched from fueleconomy.gov API (3-stage flow: fuzzy match → vehicle ID → full data)

### Data Persistence Pattern

- **Storage:** AsyncStorage (`@react-native-async-storage/async-storage`)
- **Keys:** `"vehicles"`, `"trips"` (implied), `"app_launched"` (first-launch flag)
- **Pattern:** Read on mount, write on mutation, JSON serialize/deserialize
- **No database:** Pure client-side persistence (suitable for offline use)

### API Integrations

1. **FuelEconomy.gov** (`api/fuel-economy.ts`, `app/fuelData.ts`)
   - Vercel serverless endpoint handles CORS
   - Stage 1: Fetch models by make/year (fuzzy match)
   - Stage 2: Get vehicle ID from matching model
   - Stage 3: Fetch full vehicle data with economy metrics
   - **Note:** EV support includes kWh/100km conversions, range data

2. **Mock Fuel Price Server** (`server/`)
   - Express server on localhost:3000
   - Endpoints: `/v1/stations`, `/v1/price/latest?city={city}&fuel={fuel}`
   - **Dev workflow:** `npm start` in `server/` folder (separate from frontend)

### Routing Structure

```
app/(tabs)/              # Tab-based main UI
├── dashboard.tsx       # Home, vehicle overview
├── calculator.tsx      # Multi-step fuel cost calculator
├── history.tsx         # Trip records list
├── vehicles.tsx        # Vehicle management
└── settings.tsx        # (mentioned in _layout, check if exists)

app/
├── _layout.tsx         # Stack root (modal/overlay support)
├── addVehicle.tsx      # Add vehicle by manual entry
├── addVehicleByPlate.tsx # Add vehicle by plate lookup
├── index.tsx           # Redirect to /dashboard, AdMob init
├── FirstLaunchModal.tsx # Legal/compliance modal
└── LegalScreen.tsx     # Privacy/ToS display (accessed from modal)
```

---

## Key Patterns & Conventions

### Component Structure

- **Functional components with hooks** (no class components)
- **Props interfaces** defined locally or in `components/ui/`
- **Themed components** (`ThemedText`, `ThemedView`) for cross-platform styling
- **UI library:** Radix-based (`components/ui/`) + custom variants (`ActionButton.tsx`, `BannerAd.tsx`, `VideoAd.tsx`)
- **Lucide icons** for iconography (`lucide-react-native`)

### AsyncStorage Usage

```typescript
// Read: Load vehicles on screen mount
const existing = await AsyncStorage.getItem("vehicles");
const vehicles = existing ? JSON.parse(existing) : [];

// Write: Save updated vehicle list
await AsyncStorage.setItem("vehicles", JSON.stringify(updatedVehicles));
```

**Important:** Always wrap in try-catch, handle `null` for missing keys.

### Calculator Workflow

Implemented as **multi-step form** in `calculator.tsx` and sub-components:
1. `VehicleStep.tsx` - Select vehicle
2. `FuelPriceStep.tsx` - Enter fuel price/electricity cost
3. `DistanceStep.tsx` - Enter distance
4. `ResultsStep.tsx` - Display cost breakdown + consumption metrics

**State pattern:** Parent component manages step index, individual steps handle input.

### Localization

- **Default language:** Hebrew (RTL layout)
- **String literals:** Both English and Hebrew inline (no i18n framework yet)
- **UI strings library:** `legal/LEGAL_UI_STRINGS_HE.ts` for legal content

### AdMob Integration

- **Platform-specific:** Only initializes on native (iOS/Android), skipped on Web
- **Web fallback:** Metro config (`metro.config.js`) resolves `react-native-google-mobile-ads` to empty module on web
- **Pattern:** Use `Platform.OS !== 'web'` checks before AdMob calls

### Legal/Compliance

- **FirstLaunchModal** displayed on app first launch (checks `"app_launched"` AsyncStorage key)
- **LegalScreen.tsx** - Full privacy policy + terms of service (both Hebrew)
- **Files:** `legal/PRIVACY_POLICY_HE.md`, `legal/TERMS_OF_SERVICE_HE.md`, `legal/GOOGLE_PLAY_CHECKLIST.md`
- **Compliance:** See `legal/START_HERE_LEGAL.md` for integration guide

---

## Developer Workflows

### Build & Run

```bash
# Install dependencies (root)
npm install

# Web (dev)
npm run web

# Native (Expo Go)
npm run ios      # or: npm run android

# Lint
npm run lint     # ESLint + Expo lint

# Reset project state
npm run reset-project
```

### Development Server

**Frontend:**
```bash
npm start        # Starts Expo Metro bundler (auto-selects platform prompt)
```

**Backend (optional, for local fuel price testing):**
```bash
cd server
npm install
npm start        # Runs on localhost:3000
```

### Testing & Debugging

- **No unit tests configured** (no jest/vitest setup found)
- **Expo DevTools:** Available via Expo CLI (shake device or press 'i'/'a')
- **Web debugging:** Chrome DevTools for web builds
- **Async debugging:** Use AsyncStorage console methods or React DevTools Profiler

### Common Tasks

1. **Adding a new screen:**
   - Create `.tsx` in `app/` or `app/(tabs)/`
   - Update `app/_layout.tsx` (root) or `app/(tabs)/_layout.tsx` (tabs)
   - Use `useRouter()` from `expo-router` for navigation

2. **Adding vehicle field:**
   - Update `Vehicle` interface in `app/vehiclesData.ts`
   - Update add vehicle forms (`addVehicle.tsx`, `addVehicleByPlate.tsx`)
   - Update persistence (AsyncStorage key handling)

3. **New calculator metric:**
   - Add field to `CalculationResult` interface
   - Update `ResultsStep.tsx` to display
   - Implement calculation logic in parent `calculator.tsx`

---

## Critical Dependencies & Gotchas

1. **Expo Router v6:** Uses file-based routing (no `react-navigation` config needed for basic setup)
2. **AsyncStorage blocking calls:** Can cause UI jank; consider using `useEffect` with loading states
3. **Platform differences:** 
   - Web uses `@expo/vector-icons` but some icons render differently
   - AdMob not available on web (must handle gracefully)
   - Metro bundler resolves `react-native` vs `react-native-web` automatically
4. **FuelEconomy.gov API:**
   - Requires 3 sequential requests; cache results (Vercel endpoint does 1-week cache)
   - EV data includes kWh metrics; gas data uses MPG (both converted to km/L internally)
5. **TypeScript:** Strict mode enabled (`tsconfig.json`); use proper typing for AsyncStorage payloads

---

## File Structure Reference

| Path | Purpose |
|------|---------|
| `app/vehiclesData.ts` | Vehicle interface & calculation logic |
| `app/fuelData.ts` | FuelEconomyResult interface, API fetch logic |
| `types/trip.ts` | Trip/FuelRecord data model |
| `api/fuel-economy.ts` | Vercel serverless endpoint (CORS proxy) |
| `components/calculator/` | Multi-step calculator UI |
| `components/trip/` | Trip display/edit components |
| `components/ui/` | Radix-based UI library |
| `constants/theme.ts` | Color & theme constants |
| `legal/` | Privacy policy, ToS, compliance docs |
| `server/` | Express mock API for fuel prices (dev only) |

---

## Questions to Clarify Before Large Changes

- Is data persistence moving beyond AsyncStorage (e.g., SQLite)?
- Will the app support user accounts / cloud sync?
- Are there analytics/crash reporting requirements beyond current setup?
- Should calculator support multiple vehicles in a single trip?
