# CheckFuel - AI Context & Guidelines

## Project Overview
CheckFuel is a multi-platform (iOS, Android, Web) fuel economy and cost calculator application. It allows users to track vehicle fuel consumption, calculate trip costs, look up vehicle license plates, and make informed decisions about fuel efficiency for both gasoline and EV vehicles.

The app places a high priority on cross-platform consistency, local data persistence, and internationalization (specifically RTL support for Hebrew).

## Technology Stack
When generating, reviewing, or refactoring code, strictly adhere to the following stack:
* **Framework:** Expo / React Native
* **Routing:** Expo Router (v6) - *File-based routing*
* **Language:** TypeScript (Strict mode preferred)
* **State & Storage:** `AsyncStorage` for local persistence
* **UI & Styling:** Radix UI components, Tailwind CSS (for Web), React Native StyleSheet (for Mobile).
* **External APIs:** FuelEconomy.gov API, Custom Express mock server (for fuel prices)
* **Monetization:** Google AdMob (`react-native-google-mobile-ads`)

## Coding Conventions & AI Guidelines

### 1. Architecture & Routing
* Use **Expo Router** conventions. Place all navigable screens inside the `app/` directory.
* Keep UI components modular and reusable in the `components/` directory.
* Abstract API calls into the `api/` directory. Do not write fetch calls directly inside React components.

### 2. TypeScript & Data Models
* Always use TypeScript. Ensure interfaces and types are properly defined in the `types/` directory.
* Avoid using `any`. Use `unknown` if the type is truly dynamic, or explicitly define the shape of the API responses.

### 3. Localization & RTL (Hebrew Support)
* The app supports Hebrew and RTL (Right-to-Left) layouts. 
* When generating UI code, ensure layout components (like flexbox directions, margins, and paddings) use logical properties (e.g., `marginStart`, `paddingEnd` instead of `marginLeft`, `paddingRight`) to seamlessly support RTL flipping.

### 4. AdMob Integration specifics
* When working with AdMob (specifically Rewarded Ads), strictly use the updated API methods. 
* *Crucial Note:* Use `RewardedAdEventType.LOADED` (and related `RewardedAdEventType` enums) instead of the deprecated `AdEventType` when adding event listeners to Rewarded Ads.

### 5. Local Development Context
* Assume the mock server for fuel prices runs on `http://localhost:3000`. Ensure API utility functions can toggle between local environments and production URLs using environment variables.

## Project Structure
Use this structure to understand where to place or find files:
├── app/             # Expo Router screens and layouts
├── components/      # Reusable UI components (buttons, modals, inputs)
├── constants/       # Theme, colors, and configuration constants
├── types/           # TypeScript type definitions (.d.ts and interfaces)
├── api/             # External API integration functions (FuelEconomy, etc.)
├── server/          # Express mock server for fuel price data
└── legal/           # Legal documents, privacy policies, compliance files