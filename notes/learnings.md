# Learnings

- 2026-04-05: The wallet app did not have an ATM map feature wired into navigation. The lowest-risk first step is exposing the live `americabitcoinatm.com/locations/` page from the Tools screen so Storepoint-backed listings stay in sync with the website.
- 2026-04-05: The in-app locator now uses `react-native-webview` to embed the live America Bitcoin ATM locations page. Keep `americabitcoinatm.com` and Storepoint pages in-app, and hand external links like maps, phone, and email off to the system.
