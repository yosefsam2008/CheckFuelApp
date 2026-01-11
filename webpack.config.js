// webpack.config.js
// Ensures process.env.EXPO_ROUTER_APP_ROOT is replaced with a string literal
// at build time so expo-router's require.context calls work on web.
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.DefinePlugin({
      // Set to the folder containing your routes (relative path string)
      'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify('./app'),
      // Define import mode so require.context's 4th argument is a literal
      'process.env.EXPO_ROUTER_IMPORT_MODE': JSON.stringify('sync'),
    })
  );

  // Dev server proxy: forward /api requests to the Vercel API to avoid CORS in development
  if (config.devServer) {
    config.devServer.proxy = config.devServer.proxy || {};
    config.devServer.proxy['/api'] = {
      target: 'https://checkfuel.vercel.app',
      changeOrigin: true,
      secure: true,
      // keep path as /api/...
      pathRewrite: { '^/api': '/api' },
      onProxyReq: (proxyReq, req, res) => {
        // optional: you can modify headers here if needed
      },
    };
  }

  return config;
};
