// EAS pre-install hook: keep expo-dev-client (ML Kit, Compose, Apollo...) out of production builds.
// Autolinking has no per-profile switch, so on the EAS worker we add an exclude to package.json.
const fs = require('fs');
const path = require('path');

if (process.env.EAS_BUILD_PROFILE !== 'production') process.exit(0);

const file = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const dev = ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu', 'expo-dev-menu-interface'];
pkg.expo = pkg.expo || {};
pkg.expo.autolinking = pkg.expo.autolinking || {};
pkg.expo.autolinking.exclude = [...new Set([...(pkg.expo.autolinking.exclude || []), ...dev])];
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
console.log('Excluded from autolinking:', pkg.expo.autolinking.exclude.join(', '));
