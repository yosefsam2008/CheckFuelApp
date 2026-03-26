# CheckFuel ⛽

**CheckFuel** (מחשבון דלק ונסיעות) is a professional, cross-platform mobile application that empowers drivers to accurately calculate fuel consumption, trip costs, and vehicle efficiency. Developed with React Native and Expo, CheckFuel works seamlessly on **iOS**, **Android**, and **Web** platforms with full **Hebrew (RTL)** language support.

---

## ✨ Key Features

### 🚗 Vehicle Management
- **Add Vehicles by Manual Entry** or **License Plate Lookup** (powered by FuelEconomy.gov database)
- **Multi-Fuel Support**: Gasoline, Diesel, and Electric vehicles
- **Comprehensive Vehicle Data**: Store plate number, model, engine specs, manufacturing year, fuel type, and average consumption metrics
- **Local Data Persistence**: Vehicle details are saved securely on the user's device using **AsyncStorage** (client-side only, no remote server required)

### 🧮 Trip Cost Calculator
- **Multi-Step Calculator Interface**: Intuitive step-by-step process with visual progress tracking
  - Step 1: Vehicle Selection
  - Step 2: Fuel Price / Electricity Cost Input
  - Step 3: Distance Entry
  - Step 4: Result Breakdown & Cost Analysis
- **Fuel Consumption Estimates**: Dynamically adjusted calculations based on driving style, trip type, vehicle age, climate conditions, and AC usage
- **Consumption Metrics**:
  - **Fuel Vehicles**: km/L (kilometers per liter)
  - **Electric Vehicles**: kWh/km (kilowatt-hours per kilometer)
- **Cost Breakdown**: Display per-kilometer costs and total trip expenses

### 📊 Historical Trip Tracking
- **Trip History Log**: All completed trips are saved locally with timestamps, distances, costs, and consumption data
- **Trip Records Include**: Vehicle name, model, fuel type, distance, cost, fuel consumed, cost-per-kilometer, and energy type classification
- **Delete & Clear Options**: Remove individual trips or clear entire history
- **Sorting**: Trips automatically sorted by most recent first

### 🌐 Cross-Platform Compatibility
- **Single Codebase**: Unified development using Expo Router for iOS, Android, and Web
- **Native Performance**: Full access to device capabilities on mobile (location, haptics, storage)
- **Responsive Web Design**: Optimized web experience with Radix UI and Tailwind CSS
- **RTL Layout Support**: Complete right-to-left text direction support for Hebrew language

### 🎯 User Experience
- **First-Launch Modal**: Legal compliance and privacy policy acceptance on initial app startup
- **Persistent State Management**: User preferences and data retained across sessions
- **Accessibility Features**: Semantic HTML, screen reader support, and accessibility labels
- **Smooth Animations**: Polished transitions and visual feedback using React Native Animated API

### 💰 Monetization
- **Google AdMob Integration**: Rewarded video ads for premium features (plate detection, vehicle info)
- **Banner Ads**: Persistent non-invasive banner advertisements
- **Platform-Aware**: Ads function on iOS and Android; gracefully disabled on Web

---

## 🛠️ Tech Stack & Libraries

### **Core Framework**
- **React Native** `0.81.5` — Cross-platform mobile framework
- **Expo** `~54.0.29` — Managed React Native platform
- **Expo Router** `~6.0.19` — File-based routing and navigation
- **React** `19.1.0` — UI library

### **Language & Type Safety**
- **TypeScript** `~5.9.2` — Static type checking and development tooling

### **State Management & Storage**
- **AsyncStorage** (`@react-native-async-storage/async-storage` `^2.2.0`) — Local device persistence for vehicles and trip history
- **React Context API** — State distribution across screens
- **React Hooks** — Functional component state management

### **UI & Styling**
- **Radix UI** (v1.x) — Accessible component primitives (@radix-ui/react-*)
- **Tailwind CSS** — Utility-first CSS framework (Web)
- **React Native StyleSheet** — Native platform styling
- **Lucide Icons** (`lucide-react` / `lucide-react-native`) — Vector iconography

### **Navigation & Routing**
- **React Navigation** — Underlying navigation library
  - `@react-navigation/bottom-tabs` — Tab-based main interface
  - `@react-navigation/stack` — Stack-based modal/overlay navigation
  - `@react-navigation/native` — Core navigation primitives

### **Platform-Specific Libraries**
- **expo-location** `~19.0.8` — GPS and location services
- **react-native-google-mobile-ads** `^16.3.0` — AdMob integration
- **react-native-maps** `1.20.1` — Map display (optional feature support)
- **expo-linear-gradient** `^15.0.8` — Gradient backgrounds

### **Additional Libraries**
- **Firebase** `^12.10.0` — Analytics and backend services
- **fast-xml-parser** `^5.3.2` — XML data parsing
- **expo-constants** — App configuration and metadata
- **expo-web-browser** — In-app browser for external links
- **react-native-gesture-handler** — Touch and gesture support
- **react-native-reanimated** — Advanced animations

### **Development Tools**
- **ESLint** `^9.25.0` — Code quality linting
- **Webpack** `^5.104.1` — Web bundling
- **Metro** — React Native bundler (configured via `metro.config.js`)

---

## 📁 Project Architecture

### Directory Structure

```
checkfuel/
├── app/                          # Expo Router screens (file-based routing)
│   ├── (tabs)/                   # Tab-based main interface
│   │   ├── _layout.tsx          # Tab navigation setup
│   │   ├── dashboard.tsx        # Home/overview screen with statistics
│   │   ├── calculator.tsx       # Multi-step trip cost calculator
│   │   ├── history.tsx          # Trip history and records
│   │   └── vehicles.tsx         # Vehicle management interface
│   ├── _layout.tsx              # Root stack layout (modals/overlays)
│   ├── index.tsx                # App entry point (redirects to dashboard)
│   ├── index.web.tsx            # Web-specific entry point
│   ├── addVehicle.tsx           # Manual vehicle entry screen
│   ├── addVehicleByPlate.tsx    # License plate lookup screen
│   ├── LegalScreen.tsx          # Privacy policy & terms display
│   ├── UserGuideScreen.tsx      # User guide/help screen
│   ├── Toast.tsx                # Toast notification component
│   └── FirstLaunchModal.tsx     # Legal acceptance modal
│
├── components/                   # Reusable UI components
│   ├── calculator/              # Calculator step components
│   │   ├── VehicleStep.tsx      # Vehicle selection step
│   │   ├── FuelPriceStep.tsx    # Price input step
│   │   ├── DistanceStep.tsx     # Distance entry step
│   │   ├── ResultsStep.tsx      # Results display step
│   │   ├── ProgressBar.tsx      # Visual progress indicator
│   │   └── Toast.tsx            # In-calculator notifications
│   ├── trip/                    # Trip history components
│   │   ├── TripCard.tsx         # Trip list card item
│   │   ├── TripDetailsModal.tsx # Trip detail view
│   │   ├── DeleteConfirmModal.tsx # Confirmation dialog
│   │   └── EmptyState.tsx       # Empty state placeholder
│   ├── modals/                  # Modal components
│   │   └── FirstLaunchModal.tsx # First-launch legal modal
│   ├── ui/                      # Radix UI components (20+ files)
│   │   ├── accordion.tsx        # Accordion component
│   │   ├── alert.tsx            # Alert component
│   │   ├── avatar.tsx           # Avatar component
│   │   ├── badge.tsx            # Badge component
│   │   └── [other components]   # Additional Radix primitives
│   ├── ActionButton.tsx         # Custom action button
│   ├── BannerAd.tsx             # Banner advertisement (native)
│   ├── BannerAd.web.tsx         # Banner ad (web stub)
│   ├── VideoAd.tsx              # Rewarded video ad (native)
│   ├── VideoAd.web.tsx          # Video ad (web stub)
│   ├── VehicleRewardedAd.tsx    # Vehicle-specific rewarded ad
│   ├── PlateDetectionRewardedAd.tsx # Plate detection rewarded ad
│   ├── haptic-tab.tsx           # Haptic feedback component
│   ├── themed-text.tsx          # Themed Text wrapper
│   └── themed-view.tsx          # Themed View wrapper
│
├── lib/                         # Utility functions and data
│   ├── utils.ts                 # General utility functions
│   ├── data/
│   │   ├── vehiclesData.ts      # Vehicle interface and types
│   │   ├── vehicleWeightLookup.ts  # Weight data for consumption calculations
│   │   ├── fuelConsumptionAdjustments.ts # Dynamic consumption adjustment logic
│   │   └── [other data models]
│   └── constants/               # Data constants
│
├── types/                       # TypeScript type definitions
│   └── trip.ts                  # TripRecord interface
│
├── hooks/                       # Custom React hooks
│   ├── use-color-scheme.ts      # Color scheme detection
│   ├── use-color-scheme.web.ts  # Web color scheme variant
│   ├── use-theme-color.ts       # Theme color management
│   ├── use-unified-router.ts    # Router utility hook
│   └── useAdTracking.ts         # Ad tracking hook
│
├── constants/                   # Global constants
│   └── theme.ts                 # Color scheme and theme configuration
│
│
├── legal/                       # Legal & compliance documents
│   ├── PRIVACY_POLICY_HE.md     # Hebrew privacy policy
│   ├── PRIVACY_POLICY_EN.md     # English privacy policy
│   ├── TERMS_OF_SERVICE_HE.md   # Hebrew terms of service
│   ├── TERMS_OF_SERVICE_EN.md   # English terms of service
│   ├── LEGAL_UI_STRINGS_HE.ts   # UI strings constant (Hebrew)
│   ├── LEGAL_INTEGRATION_GUIDE.md  # Implementation guide
│   └── [compliance documentation]
│
├── server/                      # Mock Express.js server (dev only)
│   ├── index.js                 # Express server setup
│   ├── package.json             # Server dependencies
│   ├── data/                    # Mock data files
│   └── README.md                # Server documentation
│
├── plugins/                     # Expo config plugins
│   └── withAdMobManifest.js     # AdMob manifest plugin
│
├── scripts/                     # Build and utility scripts
│   ├── reset-project.js         # Project reset utility
│   ├── extract-engine-database.js # Engine data extraction
│   └── wrap-console-logs.js     # Console logging wrapper
│
├── tools/                       # Development tools (not runtime)
│   └── discoverAPIFields.ts     # API field discovery utility
│
├── mocks/                       # Platform mocks
│   └── react-native-google-mobile-ads.web.js # AdMob web stub
│
├── android/                     # Android native project
│   ├── app/                     # Android app module
│   ├── build.gradle             # Root Gradle build file
│   └── gradle/                  # Gradle configuration
│
├── assets/                      # Static assets
│   └── images/                  # App icons, splash screens, etc.
│
├── app.json                     # Expo app configuration
├── eas.json                     # EAS Build configuration
├── tsconfig.json                # TypeScript compiler options
├── metro.config.js              # Metro bundler configuration
├── webpack.config.js            # Webpack configuration (web)
├── package.json                 # NPM dependencies and scripts
└── index.js                     # App entry point

```

### Key Component Relationships

```
App Root (index.tsx)
  └── RootLayout (_layout.tsx)
      ├── FirstLaunchModal
      └── TabsLayout ((tabs)/_layout.tsx)
          ├── Dashboard Screen
          │   ├── StatCard Component
          │   ├── ActionButton Component
          │   └── BannerAd Component
          │
          ├── Calculator Screen
          │   ├── VehicleStep
          │   ├── FuelPriceStep
          │   ├── DistanceStep
          │   └── ResultsStep
          │       └── VideoAd Component
          │
          ├── History Screen
          │   ├── TripCard (FlatList)
          │   ├── TripDetailsModal
          │   └── BannerAd Component
          │
          └── Vehicles Screen
              ├── VehicleCard
              ├── AddVehicleModal
              ├── VehicleRewardedAd
              └── PlateDetectionRewardedAd
```

### Data Flow Architecture

1. **User Data Input** → AsyncStorage Layer
2. **AsyncStorage** ← → Local device storage (persistent)
3. **React State** ← Hydrated from AsyncStorage on component mount
4. **Calculations** → Adjusted consumption + cost computation
5. **Display** → UI rendering with themed components

#### Data Models
- **Vehicle** (`lib/data/vehiclesData.ts`) — Stores vehicle specs
- **TripRecord** (`types/trip.ts`) — Historical trip data
- **CalculationResult** — Cost and consumption results

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js 18.0** or higher (download from [nodejs.org](https://nodejs.org/))
- **npm** (comes bundled with Node.js) or **Yarn**
- **Expo CLI** (install globally: `npm install -g expo-cli`)
- **(Optional for Native)** Xcode (macOS) for iOS simulator or Android Studio for Android emulator

### Installation Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/checkfuel.git
cd checkfuel
```

#### 2. Install Dependencies

```bash
npm install
```

This will install all required npm packages listed in `package.json`.

#### 3. Configure Environment (Optional)

If your app requires environment-specific configuration:
- Create a `.env` file in the root directory (if needed by your app)
- Copy environment variables from `.env.example` if one exists

#### 4. Run the Application

**Start the Expo development server:**

```bash
npm start
```

This will display a menu prompting you to choose your platform:

- Press `i` for **iOS Simulator** (macOS only)
- Press `a` for **Android Emulator**
- Press `w` for **Web** (browser)
- Press `j` to open **Metro Bundler** developer interface

**Or run directly on a specific platform:**

```bash
npm run ios        # iOS Simulator (macOS only)
npm run android    # Android Emulator
npm run web        # Web browser (http://localhost:8081)
```

#### 5. Running the Mock Server (Development Only)

The app optionally integrates with a mock Express server for fuel price data during development:

```bash
cd server
npm install
npm start
```

The server will run at `http://localhost:3000` and provide endpoints:
- `GET /v1/stations` — List of fuel stations
- `GET /v1/price/latest?city={city}&fuel={fuel}` — Latest fuel prices

### Build for Production

#### Web Deployment

Export a static build for deployment to Vercel, Netlify, or any static host:

```bash
npm run build:web
```

This creates a production-optimized build in the `dist/` directory.

#### iOS Build (via EAS)

```bash
eas build --platform ios
```

Requires an Apple Developer account and EAS CLI configuration.

#### Android Build (via EAS)

```bash
eas build --platform android
```

Requires a Google Play Developer account and EAS CLI configuration.

### Linting & Code Quality

```bash
npm run lint
```

This runs ESLint to check code quality and style consistency.

### Reset Project State

To reset the project (clean cache, rebuild):

```bash
npm run reset-project
```

---

## 💾 Data Privacy & Storage

### Data Storage Architecture

**CheckFuel uses pure client-side storage with no remote database or cloud synchronization.**

#### Vehicle Data Storage
- **Storage Method**: **AsyncStorage** (`@react-native-async-storage/async-storage`)
- **Storage Location**: Device local storage (iOS Keychain segment, Android encrypted shared preferences)
- **Data Persistence**: Vehicle data persists across app sessions and device restarts
- **Scope**: Per-device only; data is not synced across multiple devices
- **Data Format**: JSON serialization stored under AsyncStorage key `"vehicles"`

**Vehicle Data Stored:**
```
{
  "id": "unique-vehicle-id",
  "plate": "ABC1234",
  "name": "My Tesla Model 3",
  "model": "Model 3",
  "engine": "Electric Motor",
  "type": "Sedan",
  "fueltype": "Electric",
  "avgConsumption": 18.5,          // kWh/km for electric
  "year": 2023,
  "tankCapacity": 75,               // kWh for electric, liters for fuel
  "mishkal_kolel": 1650            // Gross vehicle weight (kg)
}
```

#### Trip History Storage
- **Storage Method**: AsyncStorage
- **Storage Location**: Device local storage
- **Data Persistence**: Trip records save automatically after calculator submission
- **Data Format**: JSON array stored under AsyncStorage key `"tripHistory"`

**Trip Record Stored:**
```
{
  "id": "trip-uuid",
  "date": "2026-03-26",
  "timestamp": 1711420800000,
  "distance": 150,
  "vehicleName": "My Tesla Model 3",
  "vehicleModel": "Model 3",
  "fuelType": "Electric",
  "totalCost": 45.75,
  "fuelConsumed": 2.8,              // kWh for electric, liters for fuel
  "costPerKm": 0.305,
  "consumption": 18.67,             // kWh/km or km/L
  "energyType": "electricity"       // or "fuel"
}
```

### Data Security & Privacy

#### ✅ What Data Is **Stored Locally**
- Vehicle specifications (make, model, year, fuel type)
- Trip records (distance, cost, consumption)
- First-launch acceptance timestamp
- User preferences via AsyncStorage

#### ✅ What Data Is **NOT Collected**
- Personal identification (name, address, phone number)
- Location history (GPS tracks are not stored)
- Behavioral analytics beyond app usage
- Payment information (no purchases in-app)
- Third-party data sharing

#### ✅ What Data Is **Transmitted** (Read-Only)
1. **FuelEconomy.gov API Calls** (via Vercel proxy):
   - Make, model, year, fuel type sent to fueleconomy.gov
   - Response: Vehicle consumption metrics
   - **No user identification** is sent; API calls are anonymous

2. **Google AdMob** (iOS/Android only):
   - Anonymous ad impressions and interactions
   - Privacy Policy: [Google Privacy Policy](https://policies.google.com/privacy)

#### ✅ Data Retention
- **Vehicle Data**: Retained indefinitely until user manually deletes
- **Trip Records**: Retained indefinitely until user deletes
- **AuthZ Tokens**: None (application is stateless)
- **Cookies**: None used

### User Control & Deletion

Users can delete data at any time:
- **Individual Vehicle**: Edit vehicle screen → delete option
- **Individual Trip**: History screen → long-press trip → delete
- **All Data**: Settings screen → "Clear All Data" option
  - Clears both vehicles and trip history
  - Resets first-launch flag (legal modal reappears)

### Platform-Specific Privacy

**iOS**
- Uses system Keychain segment for AsyncStorage encryption
- Respects App Tracking Transparency (ATT) framework for ad tracking

**Android**
- Uses EncryptedSharedPreferences for secure storage
- Respects Google Play Services privacy policies

**Web**
- Uses browser LocalStorage (not encrypted)
- Same-origin policy enforced by browser
- No persistent identifiers across domains

---

## 📞 Support & Contributing

### Reporting Issues

If you encounter a bug, please:
1. Check for existing issues on GitHub
2. Provide detailed reproduction steps
3. Include platform information (iOS/Android/Web, OS version)
4. Share error logs if applicable

### Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please ensure:
- Code follows the linting rules (`npm run lint`)
- Changes are typed with TypeScript
- Features include appropriate comments
- New screens are added to navigation properly

---

## 📜 License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.

---

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) for the platform and tooling
- [FuelEconomy.gov](https://fueleconomy.gov/) for vehicle data
- [React Native](https://reactnative.dev/) community
- [Radix UI](https://www.radix-ui.com/) for accessible components

---

## 📚 Additional Resources

- **Expo Documentation**: [docs.expo.dev](https://docs.expo.dev/)
- **React Native Docs**: [reactnative.dev](https://reactnative.dev/)
- **TypeScript Handbook**: [typescriptlang.org](https://www.typescriptlang.org/docs/)
- **App Privacy Policy**: See `legal/PRIVACY_POLICY_HE.md` and `legal/PRIVACY_POLICY_EN.md`
- **Terms of Service**: See `legal/TERMS_OF_SERVICE_HE.md` and `legal/TERMS_OF_SERVICE_EN.md`

---

**Last Updated**: March 26, 2026

**Version**: 1.0.0
