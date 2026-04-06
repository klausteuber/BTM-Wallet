# America Bitcoin Wallet App - Privacy Policy

**Effective Date: February 26, 2026**
**Last Updated: February 26, 2026**

America Digital Inc, doing business as America Bitcoin ATM ("we," "us," or "our"), operates the America Bitcoin Wallet mobile application (the "App"). This Privacy Policy describes how the App handles your information and is provided in addition to the America Bitcoin ATM general privacy policy, which governs our ATM kiosk services and website at americabitcoinatm.com.

## 1. Overview

The America Bitcoin Wallet is a self-custody Bitcoin wallet. Your private keys, recovery phrases, and wallet data are generated and stored exclusively on your device. We do not have access to your private keys, cannot view your balances, and cannot recover your wallet if your recovery phrase is lost.

This App does not require you to create an account with us. There is no login, no registration, and no personal information submitted to America Digital Inc through normal use of the App.

## 2. Data We Collect

### 2.1 Data We Do Not Collect

The App does **not** collect, transmit, or store on our servers:

- Private keys or recovery phrases
- Wallet balances or transaction history
- Names, email addresses, phone numbers, or any personal identifiers
- Passwords, PINs, or biometric data
- Location data
- Browsing or search history
- Contacts, messages, photos, or other personal files

### 2.2 Data Collected Automatically

**Crash and Diagnostic Data.** The App uses Bugsnag, a third-party crash reporting service provided by SmartBear Software, to help us identify and fix errors. If the App crashes or encounters an error, Bugsnag may automatically collect:

- Device model, operating system version, and App version
- Crash logs, stack traces, and error codes
- Available memory and storage at time of crash

This data is used solely to diagnose and fix App issues. It does not include your private keys, wallet addresses, transaction data, or any personal identifiers. You cannot currently opt out of crash reporting within the App. Bugsnag's privacy policy is available at https://smartbear.com/privacy/.

**Push Notification Tokens.** If you choose to enable push notifications, your device's push token is shared with Apple Push Notification service (APNs) on iOS or Google Firebase Cloud Messaging (FCM) on Android. These tokens are used solely to deliver notifications to your device. We do not use notification tokens for advertising, tracking, or profiling.

### 2.3 Data Transmitted to Third-Party Infrastructure

**Electrum Servers.** To display wallet balances and broadcast transactions, the App connects to Electrum servers. During these connections, the following data is transmitted to the Electrum server operator:

- Your wallet's public addresses
- Signed transactions (when you send bitcoin)
- Your device's IP address

By default, the App connects to public Electrum servers that we do not own or operate. We have no control over how these server operators handle your data. You may configure the App to connect to your own private Electrum server for greater privacy. We recommend this for users who require enhanced privacy.

**Lightning Network Nodes.** If you use Lightning Network features, the App communicates with Lightning Network nodes to process payments. This may expose:

- Payment invoices and payment hashes
- Your device's IP address

These connections are made directly between your device and the Lightning Network. We do not operate Lightning routing nodes and do not have visibility into your Lightning transactions.

## 3. How We Use Data

We use crash and diagnostic data exclusively to:

- Identify and fix bugs and crashes in the App
- Improve App stability and performance

We do **not** use any data collected through the App for:

- Advertising or marketing
- User profiling or behavioral tracking
- Sale or rental to third parties
- Any purpose unrelated to App functionality and stability

## 4. Data Sharing

**We do not sell your data.** We do not share data with advertisers. We do not engage in cross-app tracking.

We share data only with the following third parties, solely for the purposes described:

| Third Party | Purpose | Data Shared |
|---|---|---|
| Bugsnag (SmartBear Software) | Crash reporting and diagnostics | Device info, crash logs, App version |
| Apple (APNs) | Push notifications on iOS | Device push token |
| Google (FCM) | Push notifications on Android | Device push token |
| Electrum server operators | Blockchain queries | Public addresses, transactions, IP address |
| Lightning Network node operators | Lightning payments | Payment data, IP address |

## 5. Tracking and Advertising

The App does **not**:

- Track you across other companies' apps or websites
- Use advertising identifiers (IDFA/GAID)
- Contain any advertising SDKs
- Use analytics SDKs beyond crash reporting
- Participate in any ad networks

The App does not request App Tracking Transparency (ATT) permission because it does not engage in tracking as defined by Apple.

Firebase Analytics and Firebase Messaging auto-initialization are explicitly disabled in the App.

## 6. On-Device Permissions

The App may request the following permissions. Each is optional and used only for the stated purpose:

- **Camera.** To scan QR codes containing Bitcoin addresses or Lightning invoices. Images are processed entirely on your device and are never transmitted or stored.
- **Face ID / Touch ID.** To authenticate you before sensitive actions such as sending bitcoin. Biometric data is managed by your device's operating system and is never accessible to the App or transmitted to us.
- **Photo Library (read).** To import images containing QR codes for scanning.
- **Photo Library (write).** To save QR code images you generate within the App.
- **Notifications.** To alert you about incoming transactions, if enabled.

You may revoke any of these permissions at any time through your device's Settings.

## 7. Data Security

All wallet data, including private keys, is stored locally on your device using the operating system's secure storage mechanisms (iOS Keychain / Android Keystore). The App does not transmit wallet data to external servers. There is no cloud backup of your wallet data unless you manually export it.

We implement reasonable measures to ensure the crash reporting data we receive through Bugsnag is protected, but no method of electronic transmission or storage is completely secure.

## 8. Data Retention and Deletion

**On-device data.** All wallet data is stored on your device and under your control. To delete all App data, uninstall the App. This permanently removes all locally stored data, including private keys and wallet information.

**Important:** Before uninstalling, ensure you have securely backed up your recovery phrase if you wish to retain access to your bitcoin. Once the App is deleted, we cannot recover your wallet data.

**Crash reporting data.** Diagnostic data collected by Bugsnag is retained according to Bugsnag's data retention policies. We do not maintain a separate copy of this data.

**Account deletion.** Because the App does not create user accounts on our servers, there is no account to delete. Uninstalling the App removes all data.

## 9. Children's Privacy

The App is not intended for anyone under the age of 18. We do not knowingly collect personal information from children. If you believe a minor has used the App, please contact us at the address below.

## 10. Your Privacy Rights

### All Users

- You may delete all App data at any time by uninstalling the App.
- You may disable push notifications, camera access, and other permissions through your device Settings.
- You may connect to your own Electrum server to prevent your public addresses from being shared with third-party server operators.

### California Residents (CCPA/CPRA)

- **Right to Know.** You may request the categories and specific pieces of personal information we have collected. Because the App does not collect personal information on our servers (beyond anonymous crash data), there is no personal information to disclose.
- **Right to Delete.** Uninstalling the App deletes all locally stored data. We do not hold personal information about you on our servers.
- **Right to Opt-Out of Sale.** We do not sell personal information collected through the App.
- **Right to Non-Discrimination.** We will not discriminate against you for exercising your privacy rights.

### Vermont Residents

We do not share personal information collected through the App with non-affiliated third parties for marketing purposes.

### European Users (GDPR)

If you are located in the European Economic Area, you have additional rights including access, rectification, erasure, restriction of processing, data portability, and objection. Because the App operates on a self-custody model with no server-side user accounts, these rights are effectively fulfilled by the App's local-only data architecture. Contact us if you have specific questions.

## 11. International Data Transfers

Crash reporting data may be processed by Bugsnag in the United States or other countries where SmartBear operates. By using the App, you acknowledge that diagnostic data may be transferred to and processed in jurisdictions outside your own.

## 12. App Store Privacy Nutrition Labels

In accordance with Apple's App Store requirements, we declare the following data collection practices:

- **Data Used to Track You:** None
- **Data Linked to You:** None
- **Data Not Linked to You:** Crash data, performance data

## 13. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Material changes will be reflected by updating the "Last Updated" date at the top of this page. We encourage you to review this page periodically. Your continued use of the App after changes are posted constitutes acceptance of the updated policy.

## 14. Contact Us

If you have questions about this Privacy Policy or the App's data practices, contact us at:

**America Digital Inc (dba America Bitcoin ATM)**
Email: Info@americabitcoinatm.com
Website: https://www.americabitcoinatm.com
FinCEN Registration: 3100029597181
NMLS ID: 2521734

---

*This Privacy Policy applies solely to the America Bitcoin Wallet mobile application. For information about privacy practices relating to America Bitcoin ATM kiosk services and our website, please refer to the general privacy policy at americabitcoinatm.com/privacy-policy/.*
