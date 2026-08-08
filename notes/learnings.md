# Learnings

- 2026-04-05: The wallet app did not have an ATM map feature wired into navigation. The lowest-risk first step is exposing the live `americabitcoinatm.com/locations/` page from the Tools screen so Storepoint-backed listings stay in sync with the website.
- 2026-04-05: The in-app locator now uses `react-native-webview` to embed the live America Bitcoin ATM locations page. Keep `americabitcoinatm.com` and Storepoint pages in-app, and hand external links like maps, phone, and email off to the system.
- 2026-04-06: The wallet home screen’s three-dot menu button lives in `components/icons/SettingsButton.tsx`, so adding America Bitcoin ATM shortcuts to the home menu is a low-risk change there instead of a navigation-stack rewrite.
- 2026-04-28: On-chain receive notifications use `majorTomToGroundControl` to register wallet addresses with GroundControl; opening ReceiveDetails registers the displayed address, and enabling Notifications should also register existing wallet receive addresses.
- 2026-07-22: The scan-optimized receive screen's fullscreen QR modal is implemented in `screen/receive/ReceiveDetails.tsx`. Keep the QR as the first modal item for ATM scan-bay alignment, and keep the complete selectable receiving address directly beneath it so customers can visually verify the destination.
