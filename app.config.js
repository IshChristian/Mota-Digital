// Extends app.json. Plugins are de-duplicated so each runs once.
const pluginName = (plugin) => (Array.isArray(plugin) ? plugin[0] : plugin);

export default ({ config }) => {
  const plugins = [];
  for (const plugin of [...(config.plugins || []), "@react-native-community/datetimepicker", "expo-asset"]) {
    if (!plugins.some((existing) => pluginName(existing) === pluginName(plugin))) plugins.push(plugin);
  }

  return {
    ...config,
    name: "Mota",
    plugins,
    android: {
      ...config.android,
      package: "com.tiangroupinnovation.mota",
      config: {
        ...(config.android?.config || {}),
        googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
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
  };
};
