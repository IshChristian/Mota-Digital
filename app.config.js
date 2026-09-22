export default ({ config }) => ({
  ...config,

  name: "Mota",

  android: {
    ...config.android,

    package: "com.tiangroupinnovation.mota",

    config: {
      ...(config.android?.config || {}),

      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },

  ios: {
    ...config.ios,

    bundleIdentifier: "com.tiangroupinnovation.mota",

    config: {
      ...(config.ios?.config || {}),

      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
});
