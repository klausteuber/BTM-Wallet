# AGENTS

## User Preferences
- 2026-04-05: The user has very little coding experience and is vibe coding, so explain changes simply and keep implementation paths low-risk.

## This Codebase
- 2026-04-05: America Bitcoin ATM location data already lives on `https://americabitcoinatm.com/locations/` and is powered by Storepoint, so prefer linking to that live source instead of duplicating ATM listing data inside the app unless a native map is explicitly needed.
- 2026-04-06: For iOS simulator Debug builds, do not assume Metro is running. Keep a bundled `main.jsbundle` available and preserve the `AppDelegate` fallback so the app can launch from Xcode without a red React Native bundle error.
