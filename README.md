# CheckFuel ⛽

**CheckFuel** (מחשבון דלק ונסיעות) is a professional, cross-platform mobile application that empowers drivers to accurately calculate fuel consumption, trip costs, and vehicle efficiency. Developed with React Native and Expo, CheckFuel works seamlessly on **iOS**, **Android**, and **Web** platforms with full **Hebrew (RTL)** language support.

---

## 🆕 What's New in This Version
- **Enhanced Fuel Consumption Engine:** Completely overhauled the fuel consumption calculation logic. The app now provides highly accurate, dynamically adjusted calculations that better reflect real-world driving scenarios, saving users even more money and taking the guesswork out of trip planning.

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
- **Advanced Fuel Consumption Estimates**: Upgraded, dynamically adjusted calculations based on driving style, trip type, vehicle age, climate conditions, and AC usage to provide the most precise estimates possible.
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

```text
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
│   ├── trip/                    # Trip history components
│   ├── modals/                  # Modal components
│   ├── ui/                      # Radix UI components (20+ files)
│   ├── ActionButton.tsx         # Custom action button
│   ├── BannerAd.tsx             # Banner advertisement (native)
│   ├── VideoAd.tsx              # Rewarded video ad (native)
│   └── [other components]
│
├── lib/                         # Utility functions and data
│   ├── utils.ts                 # General utility functions
│   ├── data/
│   │   ├── vehiclesData.ts      # Vehicle interface and types
│   │   ├── vehicleWeightLookup.ts  # Weight data for consumption calculations
│   │   └── fuelConsumptionAdjustments.ts # Dynamic consumption adjustment logic
│   └── constants/               # Data constants
│
├── types/                       # TypeScript type definitions
│   └── trip.ts                  # TripRecord interface
│
├── hooks/                       # Custom React hooks
│
├── constants/                   # Global constants
│   └── theme.ts                 # Color scheme and theme configuration
│
├── legal/                       # Legal & compliance documents
│
├── server/                      # Mock Express.js server (dev only)
│
├── plugins/                     # Expo config plugins
│
├── scripts/                     # Build and utility scripts
│
├── tools/                       # Development tools (not runtime)
│
├── mocks/                       # Platform mocks
│
├── android/                     # Android native project
│
├── assets/                      # Static assets
│
├── app.json                     # Expo app configuration
├── eas.json                     # EAS Build configuration
├── tsconfig.json                # TypeScript compiler options
├── metro.config.js              # Metro bundler configuration
├── webpack.config.js            # Webpack configuration (web)
├── package.json                 # NPM dependencies and scripts
└── index.js                     # App entry point
Data Flow Architecture
User Data Input → AsyncStorage Layer

AsyncStorage ← → Local device storage (persistent)

React State ← Hydrated from AsyncStorage on component mount

Calculations → Adjusted consumption + cost computation (Now featuring improved accuracy logic)

Display → UI rendering with themed components

🚀 Getting Started
Prerequisites
Before you begin, ensure you have the following installed on your system:

Node.js 18.0 or higher (download from nodejs.org)

npm (comes bundled with Node.js) or Yarn

Expo CLI (install globally: npm install -g expo-cli)

(Optional for Native) Xcode (macOS) for iOS simulator or Android Studio for Android emulator

Installation Steps
1. Clone the Repository
Bash
git clone [https://github.com/yourusername/checkfuel.git](https://github.com/yourusername/checkfuel.git)
cd checkfuel
2. Install Dependencies
Bash
npm install
3. Run the Application
Start the Expo development server:

Bash
npm start
This will display a menu prompting you to choose your platform:

Press i for iOS Simulator (macOS only)

Press a for Android Emulator

Press w for Web (browser)

💾 Data Privacy & Storage
Data Storage Architecture
CheckFuel uses pure client-side storage with no remote database or cloud synchronization.

Vehicle Data Storage
Storage Method: AsyncStorage (@react-native-async-storage/async-storage)

Storage Location: Device local storage (iOS Keychain segment, Android encrypted shared preferences)

Data Persistence: Vehicle data persists across app sessions and device restarts

Scope: Per-device only; data is not synced across multiple devices

Trip History Storage
Storage Method: AsyncStorage

Storage Location: Device local storage

Data Persistence: Trip records save automatically after calculator submission

Data Security & Privacy
✅ What Data Is Stored Locally
Vehicle specifications (make, model, year, fuel type)

Trip records (distance, cost, consumption)

First-launch acceptance timestamp

User preferences via AsyncStorage

✅ What Data Is NOT Collected
Personal identification (name, address, phone number)

Location history (GPS tracks are not stored)

Behavioral analytics beyond app usage

Third-party data sharing

📞 Support & Contributing
Reporting Issues
If you encounter a bug, please:

Check for existing issues on GitHub

Provide detailed reproduction steps

Include platform information (iOS/Android/Web, OS version)

Share error logs if applicable

Contributing
Contributions are welcome! To contribute:

Fork the repository

Create a feature branch (git checkout -b feature/your-feature)

Commit your changes (git commit -am 'Add your feature')

Push to the branch (git push origin feature/your-feature)

Open a Pull Request

📜 License
This project is licensed under the MIT License — see the LICENSE file for details.

🙏 Acknowledgments
Expo for the platform and tooling

FuelEconomy.gov for vehicle data

React Native community

Radix UI for accessible components

Last Updated: May 2026

Version: 1.1.0