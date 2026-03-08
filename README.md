# CheckFuel

CheckFuel is a comprehensive multi-platform fuel economy and cost calculator app built with Expo and React Native. It helps users track their vehicle fuel consumption, calculate trip costs, and make informed decisions about fuel efficiency.

## Features

### Vehicle Management
- Add vehicles manually or by license plate lookup
- Store vehicle details including make, model, year, engine type, and fuel type
- Support for both gasoline and electric vehicles
- Automatic fuel economy data integration from fueleconomy.gov

### Trip Tracking
- Record trip details including distance, fuel consumed, and costs
- Calculate consumption metrics and energy efficiency
- Maintain trip history with detailed records
- Support for multiple vehicles

### Fuel Cost Calculator
- Multi-step calculator for accurate cost estimation
- Real-time fuel price integration via mock server
- Electricity cost calculation for EV users
- Detailed breakdown of trip costs and consumption

### Cross-Platform Support
- Native iOS and Android apps
- Web version for browser access
- Consistent experience across all platforms
- RTL support for Hebrew language

### Additional Features
- Ad-supported monetization with AdMob integration
- First-launch compliance modal with legal documents
- Local data persistence with AsyncStorage
- Themed UI components with dark/light mode support

## Technology Stack

- **Frontend:** Expo Router (v6), React Native, TypeScript
- **State Management:** AsyncStorage for local persistence
- **UI Framework:** Radix UI components, Tailwind CSS (web)
- **APIs:** FuelEconomy.gov API, custom Express mock server
- **Ads:** Google AdMob (platform-specific)
- **Build:** Expo Application Services (EAS)

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd checkfuel
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. For native development:
```bash
npm run ios    # iOS
npm run android # Android
```

5. For web development:
```bash
npm run web
```

### Mock Fuel Price Server

For local development with fuel price data:

```bash
cd server
npm install
npm start
```

The server runs on `http://localhost:3000` and provides endpoints for fuel price data.

## Project Structure

```
app/                 # Main application screens and routing
components/          # Reusable UI components
constants/           # Theme and configuration constants
types/               # TypeScript type definitions
api/                 # API integration functions
server/              # Mock fuel price server
legal/               # Legal documents and compliance files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Compliance

CheckFuel includes comprehensive legal compliance features including privacy policy, terms of service, and Google Play compliance checklists. All legal documents are available in both English and Hebrew.