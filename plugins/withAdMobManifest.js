const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Custom config plugin to fix AdMob DELAY_APP_MEASUREMENT_INIT conflict
 * This plugin ensures the value is set to false and adds tools:replace directive
 */
const withAdMobManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Ensure xmlns:tools is defined
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Find existing DELAY_APP_MEASUREMENT_INIT meta-data
    const metaDataArray = application['meta-data'] || [];
    const delayInitIndex = metaDataArray.findIndex(
      (item) =>
        item.$['android:name'] === 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT'
    );

    if (delayInitIndex !== -1) {
      // Update existing entry
      metaDataArray[delayInitIndex].$ = {
        'android:name': 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
        'android:value': 'false',
        'tools:replace': 'android:value',
      };
    } else {
      // Add new entry if it doesn't exist
      metaDataArray.push({
        $: {
          'android:name': 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT',
          'android:value': 'false',
          'tools:replace': 'android:value',
        },
      });
    }

    application['meta-data'] = metaDataArray;

    return config;
  });
};

module.exports = withAdMobManifest;
