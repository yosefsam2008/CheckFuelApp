// Ensure the web bundler sees a string literal for EXPO_ROUTER_APP_ROOT
// so expo-router's internal require.context calls receive a concrete path.
// This prevents errors like:
// "First argument of `require.context` should be a string denoting the directory to require." 
//
// Set this to the folder containing your app routes. In this project that's `./app`.
process.env.EXPO_ROUTER_APP_ROOT = './app';

// Then load expo-router entry which relies on the environment variable above.
// Use require so the assignment above runs before module evaluation.
require('expo-router/entry');
