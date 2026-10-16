# America Bitcoin ATM Wallet App – Privacy Policy


**Effective Date:** February 26, 2026
**Last Updated:** October 16, 2026

America Digital Inc, doing business as America Bitcoin ATM ("we," "us," or "our"), operates the
America Bitcoin ATM Wallet mobile application (the "App"). This Privacy Policy describes how the
App handles your information and is provided in addition to the America Bitcoin ATM general
privacy policy, which governs our ATM kiosk services and website at americabitcoinatm.com.

## 1. Overview

The America Bitcoin ATM Wallet is a self-custody Bitcoin wallet. Your private keys, recovery
phrases, and wallet data are generated and stored exclusively on your device. We do not have
access to your private keys, cannot move your bitcoin, and cannot recover your wallet if your
recovery phrase is lost.

You can use the wallet without an account. The App also offers an **optional America Bitcoin
account**, which lets you verify your identity, register your wallet so our ATMs can send your
bitcoin to it, and approve purchases at our ATMs from your phone. If you create an account, we
collect the information described in Section 2.2. If you don't, the App works as a wallet only and
Section 2.2 does not apply to you.

## 2. Data We Collect

### 2.1 Data We Never Collect

Whether or not you have an account, the App never collects, transmits, or stores on our servers:

- Private keys or recovery phrases
- Your PIN or device passcode, or the fingerprint/face data your phone uses to unlock (this stays
  in your phone's operating system)
- Your contacts, messages, or browsing history
- Photos or files from your library (the App reads an image only when you pick one to scan a QR
  code, and processes it on your device)

### 2.2 Account Data (only if you create an account)

- **Contact and sign-in information:** your phone number, first name, and email address, and the
  one-time codes we send to verify them.
- **Identity verification:** if you verify your identity in the App, our verification provider
  Sumsub collects images of your government-issued ID, a selfie photo and short video (which may
  include sound), and information read from your ID such as your full name, date of birth,
  address, and document number. The selfie is compared with your ID photo to confirm it's you;
  we ask for your written consent before this face comparison. If you allow it, Sumsub may also
  collect your device's location during verification to help prevent fraud.
- **Registered wallet:** the public receiving addresses and public keys of the wallet you register,
  so our ATMs can send purchased bitcoin to it. Private keys never leave your device.
- **ATM purchase activity:** purchases you make at our ATMs and the approvals you give or decline
  in the App.
- **Device information:** an identifier and cryptographic public key for each phone signed in to
  your account (used to confirm that requests really come from your phone), your device type, and
  a record of sign-ins and account changes for security.
- **Promotional text messages:** if you opt in, a record of your consent. You can opt out at any
  time by replying STOP.

### 2.3 Data Collected Automatically

**Crash and Diagnostic Data.** The App uses Bugsnag, a third-party crash reporting service
provided by SmartBear Software, to help us identify and fix errors. If the App crashes or
encounters an error, Bugsnag may automatically collect: device model, operating system version,
and App version; crash logs, stack traces, and error codes; available memory and storage at time
of crash. This data is used solely to diagnose and fix App issues. It does not include your
private keys, wallet addresses, transaction data, or any personal identifiers.

**Push Notification Tokens.** If you choose to enable push notifications, your device's
push token is shared with Apple Push Notification service (APNs) on iOS or Google Firebase Cloud
Messaging (FCM) on Android. If you have an account, we store this token with your account so we
can tell you when an ATM purchase is waiting for your approval. We do not use notification
tokens for advertising, tracking, or profiling.

### 2.4 Data Transmitted to Third-Party Infrastructure

**Electrum Servers.** To display wallet balances and broadcast transactions, the App connects to
Electrum servers. During these connections, the following data is transmitted to the Electrum
server operator: your wallet's public addresses, signed transactions (when you send bitcoin), and
your device's IP address. By default, the App connects to public Electrum servers that we do not
own or operate. We have no control over how these server operators handle your data. You may
configure the App to connect to your own private Electrum server for greater privacy.

**Lightning Network Nodes.** If you use Lightning Network features, the App communicates with
Lightning Network nodes to process payments. This may expose payment invoices, payment hashes,
and your device's IP address. These connections are made directly between your device and the
Lightning Network. We do not operate Lightning routing nodes and do not have visibility into your
Lightning transactions.

## 3. How We Use Data

We use the data described above to:

- Provide your account: sign you in, verify your phone and email, and let you approve ATM
  purchases from your phone.
- Verify your identity and meet our legal obligations as a registered money services business,
  including anti-money-laundering, fraud-prevention, and recordkeeping requirements.
- Protect you and our ATMs from fraud and scams, for example by confirming that an approval came
  from your own phone and that bitcoin goes to the wallet you registered.
- Send you account messages (sign-in codes, purchase approvals, receipts) and, only if you opted
  in, promotional text messages.
- Diagnose and fix crashes and improve App stability.

We do not use data collected through the App for advertising profiles or behavioral tracking, and
we do not sell or rent it.

## 4. Data Sharing

We do not sell your data. We do not share data with advertisers. We do not engage in cross-app
tracking. We share data only as follows:

- **Service providers** that process data on our behalf: Sumsub (identity verification); Twilio
  (sending text messages and verification codes); Mailgun (sending email); Bugsnag / SmartBear
  Software (crash reporting); Apple (APNs) and Google (FCM) for push notifications.
- **Network infrastructure:** Electrum server operators (public addresses, transactions, IP
  address) and Lightning Network node operators (payment data, IP address), as described in
  Section 2.4.
- **Legal and regulatory:** with regulators, law enforcement, or others when required by law,
  for example to comply with the Bank Secrecy Act and anti-money-laundering rules, or to protect
  customers from fraud.
- **Business transfers:** in connection with a merger, acquisition, or sale of assets, subject to
  this Policy.

## 5. Tracking and Advertising

The App does not track you across other companies' apps or websites, does not use advertising
identifiers (IDFA/GAID), does not contain any advertising SDKs, does not use analytics SDKs
beyond crash reporting, and does not participate in any ad networks. The App does not request
App Tracking Transparency (ATT) permission because it does not engage in tracking as defined by
Apple. Firebase Analytics is disabled in the App.

## 6. On-Device Permissions

The App may request the following permissions. Each is optional and used only for the stated
purpose. You may revoke any of them at any time in your device's Settings.

- **Camera:** to scan QR codes, and to photograph your ID and take a selfie during identity
  verification. QR scanning happens on your device; verification images go to Sumsub.
- **Microphone:** identity verification may record a short video with sound.
- **Location:** to show where you are on the ATM locations map (processed on your device), and, if
  you allow it, to help Sumsub confirm your identity during verification.
- **Face ID / Touch ID / fingerprint:** to confirm sensitive actions such as sending bitcoin,
  registering your wallet, approving an ATM purchase, or deleting your account. Biometric data is
  managed by your device's operating system and is never accessible to the App or sent to us.
- **Photo Library:** to import an image containing a QR code, or to save a QR code you create.
- **Notifications:** to alert you about incoming transactions and ATM purchases waiting for your
  approval.

## 7. Data Security

All wallet data, including private keys, is stored locally on your device using the operating
system's secure storage mechanisms (iOS Keychain / Android Keystore). Account data is sent over
encrypted connections (TLS). Requests
that act on your account, such as approving a purchase, are signed with a key that never leaves
your phone. No method of electronic transmission or storage is completely secure, but we use
reasonable administrative, technical, and physical safeguards to protect your information.

## 8. Data Retention and Deletion

**On-device data.** All wallet data is stored on your device and under your control. To delete all
App data, uninstall the App. This permanently removes all locally stored data, including private
keys and wallet information. Important: before uninstalling, make sure you have securely backed up
your recovery phrase if you want to keep access to your bitcoin. Once the App is deleted, we cannot
recover your wallet data.

**Deleting your account.** You can delete your America Bitcoin account at any time:

- In the App: **Account → Delete account**.
- On the web: **https://account.americabitcoinatm.com/delete-account**.

When you delete your account, we sign you out on every device, remove your wallet registration
and push tokens, cancel pending ATM approvals, and erase your name, email address, and
promotional-text preferences. Your wallet and its bitcoin stay on your phone.

**What we keep, and why.** As a registered money services business, we are required by U.S.
anti-money-laundering law to keep certain records even after you delete your account: identity
verification records, ATM transaction records, the consent records you gave us (such as for face
comparison), and security logs. We keep these for at least **5 years**, and longer only when the
law or an investigation requires it, then delete them. They are not used for marketing.

**Crash reporting data.** Diagnostic data collected by Bugsnag is retained according to Bugsnag's
data retention policies. We do not maintain a separate copy of this data.

## 9. Children's Privacy

The App is not intended for anyone under the age of 18. We do not knowingly collect personal
information from children. If you believe a minor has used the App, please contact us at the
address below.

## 10. Your Privacy Rights

**All Users:** You can delete your account as described in Section 8, and delete all App data on
your phone by uninstalling the App. You may disable push notifications, camera, microphone,
location, and other permissions through your device Settings. You may connect to your own Electrum
server to keep your public addresses from third-party server operators.

**California Residents (CCPA/CPRA):** You have the right to know the categories and specific
pieces of personal information we have collected about you, to request deletion, and to correct
inaccurate information, subject to the legal retention requirements in Section 8. The categories
we collect are listed in Section 2.2. We do not sell or share personal information for
cross-context behavioral advertising. We will not discriminate against you for exercising your
privacy rights. To make a request, contact us using the details below.

**Vermont Residents:** We do not share personal information collected through the App with
non-affiliated third parties for marketing purposes.

**Biometric information (Illinois, Texas, Washington, and other states):** The face comparison
used in identity verification is performed by Sumsub only after you give written consent in the
App. Biometric data is used only to verify your identity and prevent fraud, is not sold, and is
retained only as long as the law requires, as described in Section 8.

**European Users (GDPR):** If you are located in the European Economic Area, you have additional
rights including access, rectification, erasure, restriction of processing, data portability, and
objection. Contact us to exercise them.

## 11. International Data Transfers

Crash reporting data may be processed by Bugsnag in the United States or other countries where
SmartBear operates. Identity verification data may be processed by Sumsub in the United States or
other countries where it operates. By using the App, you acknowledge that your data may be
transferred to and processed in jurisdictions outside your own.

## 12. App Store Privacy Labels

If you create an account, the following data is linked to you: contact information (name, email,
phone), identifiers (device ID), identity verification data (ID images, selfie photo and video,
information read from your ID), financial information (ATM purchase history, registered wallet
addresses), and, if you allow it, location during verification. Crash and performance data is not
linked to you. None of your data is used to track you.

## 13. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Material changes will be reflected by
updating the "Last Updated" date at the top of this page. We encourage you to review this page
periodically. Your continued use of the App after changes are posted constitutes acceptance of the
updated policy.

## 14. Contact Us

If you have questions about this Privacy Policy or the App's data practices, contact us at:

America Digital Inc (dba America Bitcoin ATM)
Email: Info@americabitcoinatm.com
Website: https://www.americabitcoinatm.com
FinCEN Registration: 31000292649858
NMLS ID: 2521734

This Privacy Policy applies solely to the America Bitcoin ATM Wallet mobile application. For
information about privacy practices relating to America Bitcoin ATM kiosk services and our
website, please refer to the general privacy policy at americabitcoinatm.com/privacy-policy/.
