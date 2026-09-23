const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver = {
  ...config.resolver,
  // Resolve pnpm's symlinked dependency layout without watching directories
  // outside this standalone Expo project.
  unstable_enableSymlinks: true,
  unstable_enablePackageExports: true,
};

module.exports = config;
