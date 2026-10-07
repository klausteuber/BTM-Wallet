# America Bitcoin account in the wallet app

The app talks to the customer account service at
`https://account.americabitcoinatm.com/api/mobile/v1` (BTM-Dashboard repo,
`account_service/`; see its `README.md`). Decisions made on 2026-10-06:

- **Any account can create and register a wallet.** Approving a kiosk purchase
  requires ID verification. The kiosk API answers `no_wallet` for a customer
  whose wallet isn't backed by an ID, so the kiosk falls back to a QR scan.
- **Send protections:** the first send to an address this phone has never paid
  goes through a short scam check, with an extra confirmation for customers 65
  and older. **No waiting period in the wallet** (changed the same day): the
  operator's hold-and-release at the kiosk covers that before any bitcoin is
  released.
- This repository stays local for now (no remote push).

## Where things are

| Piece | File |
|---|---|
| API client (sign-in, signup, profile, KYC, wallet, approvals; device-key signing) | `blue_modules/paired-wallet-api.ts` |
| Shared account state (`useAbtmAccount`) | `hooks/useAbtmAccount.ts` |
| Account hub: profile, ID status, wallet, approvals, activity, sign out | `screen/abtm/Account.tsx` |
| Sign in / create account (text code, "Email me a code instead", email code, Terms) | `screen/abtm/SignIn.tsx` |
| Native ID verification (SumSub MobileSDK) | `screen/abtm/VerifyId.tsx` |
| "Approve purchase at <store>" | `screen/abtm/KioskApproval.tsx` |
| Foreground poller that opens the approval screen | `components/AbtmKioskWatcher.tsx` |
| Send protections (logic + storage) | `blue_modules/send-guard.ts` |
| Send protections (screen) | `screen/abtm/SendSafetyCheck.tsx` |
| Wallet helpers (create, find registered) | `blue_modules/abtm-wallet.ts` |

Entry points: the person icon in the wallet list header, Settings → America
Bitcoin account, and Wallet details on an America Bitcoin wallet.

## Flows

**Sign in or create an account.** One phone step for both, like the website.
`POST /signup/phone` signs an existing number in, or returns a signup token.
New customers then confirm an email with a code and accept the Terms
(`/signup/email`, `/signup/email/verify`, `/signup/complete`). If the text
doesn't arrive, "Email me a code instead" signs in an existing account through
`/auth/request-code` + `/auth/verify-code` with `channel: "email"`. Every
sign-in registers this phone's device key (react-native-biometrics); tokens and
the key's public half are kept in the keychain, this device only.

**ID verification.** `GET /kyc/options` says what the customer can do:
- link an approved kiosk or Teller verification with a selfie (SumSub Face
  authentication);
- verify from scratch with a photo ID and a selfie;
- wait for a review; or call us.

The screen shows the server's biometric-consent wording and sends its version;
the server refuses to start without it and records the consent (BIPA). After
SumSub closes, the app polls the status endpoint.

**A new phone on a verified account.** A phone code alone never carries a
verified identity to a new phone, since numbers get reassigned (server rule F01,
`account_service/device_trust.py`). Until the phone passes a selfie matched
against the linked verification (`/kyc/options` state `device`), the Account
screen shows "Confirm on this phone". The wallet, purchases and ATM approvals
stay hidden. The phone that starts a selfie or ID check is the one that becomes
verified.

**Wallet.** "Create my wallet" makes a BIP84 wallet on the phone, saves it, then
registers it: a signed challenge from the server, signed with receive address
0's key (Bitcoin Signed Message), sent with the xpub in a device-signed request.
The customer is then sent to back up the recovery phrase. An America Bitcoin
wallet already on the phone can be registered instead. The account card shows
the next receive address and a QR button.

**Kiosk approvals.** When a kiosk asks to send to the customer's wallet, the
customer has 2 minutes. While the app is open, the watcher polls
`/kiosk-authorizations` every 3 seconds and opens the approval screen, which
polls every 2 seconds and shows a countdown. Approve and Decline are signed with
the device key behind Face ID. The full address appears only after approval.

**Send protections.** When Send → Next finds a destination this phone has never
paid (and that isn't one of the customer's own wallets), it opens a safety check
instead of Confirm:
1. Three yes/no questions: a stranger asked you to send; someone claiming to be
   the government, police, a bank, a utility or tech support; someone is on the
   phone telling you what to do. Any "yes" stops the send and shows the support
   number.
2. Customers 65+ (`age65Plus` from `GET /account`, a yes/no from the verified
   ID's date of birth) also see a "call us first" prompt and must type
   MY OWN DECISION.
3. Continue goes back to Send with the form intact and runs Next again, which
   now opens Confirm. There is no waiting period.

A passed check, or a broadcast, marks the addresses as known, so they aren't
checked again. On first use, each wallet's past outgoing payees are added too. There is no
amount exemption, since scammers ask for a small test payment first. The wallet
is non-custodial, so this is friction against a scammer's script, not a hard
control. Restoring the seed in another wallet bypasses it.

## Push notifications (later phase): APNs setup needed

Today approvals only appear while the app is open. Push needs:

1. **Apple Developer account (team HA66WMZT25):** create an APNs Auth Key
   (Certificates, IDs & Profiles → Keys → +, enable Apple Push Notifications
   service). Download the `.p8` once; note its Key ID. Make sure the App ID
   `com.americabitcoinatm.wallet` has Push Notifications enabled. Automatic
   signing adds `aps-environment` (already `development` in
   `BlueWallet.entitlements`; release builds get `production`).
2. **Time Sensitive Notifications** capability, so an approval request can break
   through Focus (`interruption-level: time-sensitive`).
3. **Account service secrets** (Railway, `account` service): `APNS_KEY_ID`,
   `APNS_TEAM_ID=HA66WMZT25`, `APNS_AUTH_KEY` (the `.p8` contents),
   `APNS_TOPIC=com.americabitcoinatm.wallet`, `APNS_USE_SANDBOX` (true for
   TestFlight/debug tokens from development builds; TestFlight builds use the
   production gateway).
4. **Server:** a device-signed `POST /api/mobile/v1/devices/push-token` that
   stores the APNs token on `app_devices`; when `/api/kiosk/v1/wallet-sessions`
   creates a session, send one push over HTTP/2 to `api.push.apple.com`. Set
   `apns-expiration` to the session's expiry (2 minutes) and `apns-collapse-id`
   to the session id. The payload carries the store name only: no address, no
   amounts.
5. **App:** request permission after sign-in, register for remote notifications
   (`@react-native-community/push-notification-ios` is already installed; the
   existing GroundControl notifications are separate), send the token, and
   open `AbtmKioskApproval` with the session id on tap. Approve still happens
   in the app behind Face ID, never from the notification itself.

## Building

- **Simulator / debug:** `npm start`, then build the `BlueWallet` scheme of
  `ios/BlueWallet.xcworkspace`. Run `scripts/hermes-config.sh Debug` first.
  React Native's own Hermes switch runs `tar` on an unquoted path, breaks on the
  spaces in this checkout's path, and empties `ios/Pods/hermes-engine` (restore
  with `pod install`).
- **Spaces in the path:** React Native's codegen phase ("Generate Specs") ran its
  scripts unquoted; the Podfile's `post_install` rewrites that phase so it works
  from this checkout. Building through a symlink doesn't help, because Xcode
  resolves the workspace to its real path.
- **Xcode 26+:** the Podfile compiles the `fmt` pod as C++17. Its C++20 consteval
  code doesn't compile with the newer clang.
- **Local account service:** debug builds show a "Switch server" button on the
  signed-out Account screen (production ↔ `http://localhost:5121`). In the
  BTM-Dashboard repo run
  `ACCOUNT_DEV_CODES=1 venv/bin/python -c "from account_service import create_app; create_app().run(port=5121)"`.
- **TestFlight:** see the `beta_local` lane in `fastlane/Fastfile`. It needs Ruby 3.1
  (`/opt/homebrew/opt/ruby@3.1/bin`). The gems are installed in `vendor/bundle`.
  ```
  export PATH="/opt/homebrew/opt/ruby@3.1/bin:$PATH"
  bundle exec fastlane beta_local
  ```
  It switches Hermes to Release, sets the build number to TestFlight's latest +
  1, builds with Xcode automatic signing, and uploads. You sign in to Apple when
  prompted (Apple ID + 2FA, then an app-specific password for the upload).
  Xcode must be signed in to an account on team HA66WMZT25 (Settings →
  Accounts).
- The SumSub SDK comes from SumSub's own CocoaPods spec repo (top of the
  Podfile). Camera and microphone strings are in `Info.plist`.

## Tests

`npx jest tests/unit/abtm-api.test.ts tests/unit/send-guard.test.ts tests/unit/abtm-paired-wallet.test.ts`
