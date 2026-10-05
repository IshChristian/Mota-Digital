# Initial linking lifecycle repair

Expo Router 57.0.23 and 57.0.24 have identical NavigationContainer code that passes a state setter directly to initial URL resolution. Its useThenable initializer starts URL resolution during render. An asynchronous URL can resolve before that render commits or after React abandons it, triggering the reported not-yet-mounted state update warning.

The install patch wraps the unhandled-link callback: initial results wait in a ref until a committed effect; live results dispatch while mounted; cleanup disables dispatch. URL parsing, initial route state, subscriptions and account verification remain intact. The patch applies to both patch versions through the postinstall script during pnpm installation. Recheck and remove it when upgrading to an upstream implementation that fixes this lifecycle.

After pulling, run `pnpm install` and `pnpm exec expo start --clear`. Verify Android cold launch, deep links, login/logout and Fast Refresh. Automated regressions cover pre-mount promises, synchronous links, abandoned render, mounted delivery, cleanup and Strict Mode effect replay. Native-device runtime verification remains required.

If installing with `--ignore-scripts`, run `pnpm run postinstall` explicitly. The script is idempotent and fails clearly if an upstream upgrade changes the implementation. No dependency upgrades or lockfile changes are required.
