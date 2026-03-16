# CheckFuel ⛽

**CheckFuel** is a professional-grade, cross-platform fuel economy and trip cost calculator designed to help drivers better understand their vehicle’s efficiency and make smarter fueling decisions. It supports gasoline, diesel, and electric vehicles.

This project was built with React Native and Expo, targeting iOS, Android, and Web.

---

## ✨ Core Features

- **Vehicle Management**: Add vehicles manually or by license plate lookup. Supports both **gasoline** and **electric** powertrains.
- **Trip Cost Calculator**: A multi-step process to get accurate trip cost estimates based on your vehicle's specs.
- **Historical Data**: All trips are saved locally to your device, allowing you to track and compare efficiency over time.
- **Real Fuel Pricing**: Integrates with a local Express server for mock fuel pricing data during development.
- **Cross-Platform & RTL Support**: A single codebase for iOS, Android, and Web, with full Right-to-Left (RTL) support for Hebrew.
- **Monetization**: Includes Google AdMob integration for rewarded ads.

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js 18+**
- **Expo CLI** (`npm install -g expo-cli`)
- (Optional) iOS Simulator (via Xcode) or Android Emulator (via Android Studio) for native testing.

### Installation & Running the App

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd checkfuel
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the application:**
    ```bash
    npm start        # Starts the Metro bundler and shows a QR code
    npm run ios      # Run on iOS simulator (macOS only)
    npm run android  # Run on Android emulator
    npm run web      # Run the web version in your browser
    ```

### Running the Mock Server

For development, the app uses a mock server for fuel prices.

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

2.  **Install server dependencies and run:**
    ```bash
    npm install
    npm start
    ```
    The server will run at `http://localhost:3000`.

---

## 🧱 Tech Stack & Architecture

- **Framework:** React Native / Expo
- **Routing:** Expo Router v6 (file-based routing)
- **Language:** TypeScript
- **State & Storage:** React Context & `AsyncStorage` for local persistence.
- **Styling:**
    - **Web:** Radix UI & Tailwind CSS
    - **Mobile:** Custom React Native `StyleSheet` components.
- **APIs & Data Sources:**
    - **Consumption Model:** The vehicle consumption estimation logic in `/lib/data/fuelConsumptionAdjustments.ts` uses a dynamic model to provide realistic, adjusted consumption figures. It is based on statistical data from sources like `fueleconomy.gov` and does not make live API calls.
    - **Fuel Prices (Development):** A custom Express mock server (`/server`) is used to provide fuel price data during development.
    - **Developer Scripts:** Scripts in `/tools` and `/scripts` use the `data.gov.il` API to fetch and process data for building internal databases, but this is not a runtime dependency for the app.
- **Monetization:** `react-native-google-mobile-ads` for rewarded video ads.

---

## 📁 Project Structure

The project follows a standard Expo Router layout:

```
.
├── app/             # Screens & Expo Router file-based routes
├── components/      # Reusable UI components (buttons, modals, etc.)
├── constants/       # Theme, colors, and global constants
├── api/             # Functions for interacting with external APIs
├── server/          # Mock Express.js server for fuel prices
├── types/           # TypeScript type definitions
├── legal/           # Privacy Policy, ToS, and compliance docs
└── GEMINI.md        # Context and guidelines for AI-assisted development
```

---

## 🤖 AI Contributor Guidelines

This project uses AI for development assistance. All contributors (human or AI) must follow the guidelines outlined in `GEMINI.md`. This file contains important information about the project's architecture, coding conventions, and technology stack. Please review it before making changes.

---

## 🤝 Contributing

1.  Fork the repository.
2.  Create a descriptive feature branch.
3.  Make your changes. Ensure you follow the project's coding style and conventions.
4.  Run the linter to check for issues: `npm run lint`.
5.  Submit a pull request with a clear description of your changes.

---

## 📄 License

This project is licensed under the **MIT License**.
