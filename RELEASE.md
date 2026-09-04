# How to make a release

## Apple

* TBD

## Android (Google Play)

Play accepts **signed Android App Bundles** (`.aab`) only. The legacy
`assembleRelease` + `apksigner` flow in `build-release-apk.yml` produces APKs for
BrowserStack and direct distribution; it cannot be used for Play uploads.

### One-time setup

1. **Firebase / `google-services.json`**

   The committed `android/app/google-services.json` was generated for upstream
   BlueWallet (`io.bluewallet.bluewallet`) and does not match this app's
   `applicationId` (`com.americabitcoinatm.wallet`). Every Gradle build fails on
   `processReleaseGoogleServices` until it is replaced.

   In the [Firebase console](https://console.firebase.google.com), open (or create)
   your own project, add an Android app with package name
   `com.americabitcoinatm.wallet`, download the generated `google-services.json`,
   and replace `android/app/google-services.json` with it. Store the same file
   contents in the `GOOGLE_SERVICES_JSON` GitHub secret — both Android workflows
   write it out before building.

2. **Bugsnag**

   `AndroidManifest.xml` reads the notifier key from the `bugsnagApiKey` manifest
   placeholder, which defaults to the key inherited from upstream BlueWallet. Until
   you set your own, crash reports from your users land in *their* Bugsnag project.
   Create a Bugsnag project for this app and set the `BUGSNAG_API_KEY` GitHub secret
   (or `-PABA_BUGSNAG_API_KEY` locally).

3. **Upload key**

   Create a keystore and keep it (plus its passwords) backed up somewhere durable —
   losing it means losing the ability to ship updates:

   ```
   keytool -genkeypair -v -keystore android/upload-keystore.jks \
     -alias upload -keyalg RSA -keysize 4096 -validity 10000
   ```

   For local release builds, copy `android/keystore.properties.example` to
   `android/keystore.properties` (git-ignored) and fill it in. For CI, set these
   secrets: `KEYSTORE_FILE_HEX` (the keystore as hex, see the `prepare_keystore`
   lane), `KEYSTORE_PASSWORD`, `KEYSTORE_KEY_ALIAS`, and `KEYSTORE_KEY_PASSWORD`
   if it differs from the store password.

   Enroll in **Play App Signing** so Google holds the app signing key and this
   keystore is only the upload key.

4. **Play Console**

   Organization developer account `9009523567988088336`:
   <https://play.google.com/console/u/0/developers/9009523567988088336>

   Create the app with package name `com.americabitcoinatm.wallet` (permanent),
   then complete: store listing, privacy policy URL, Data safety form, content
   rating, and the **Financial features** declaration (declare it as a
   non-custodial crypto wallet).

   Because this is an *organization* account, the 12-testers-for-14-days closed
   testing requirement does not apply — production is available as soon as review
   passes. Internal testing is still the fastest way to sanity-check a bundle,
   since it skips review entirely.

### Building a release bundle

In CI, run the **BuildReleaseAab** workflow (manual dispatch). It stamps the
`versionCode`, builds a signed bundle, verifies the signature, and uploads the
`.aab` as a build artifact.

Locally:

```
BUILD_NUMBER=$(date +%s) \
KEYSTORE_FILE=android/upload-keystore.jks \
KEYSTORE_PASSWORD=... \
KEYSTORE_KEY_ALIAS=upload \
bundle exec fastlane android build_release_aab
```

The signed bundle lands in
`android/app/build/outputs/bundle/release/AmericaBitcoinATM-<version>-<build>.aab`.

`versionCode` must be strictly higher than the last uploaded one. The workflows
default to a Unix timestamp; pass an explicit `version_code` input to control it.

### Uploading

Upload the `.aab` by hand in Play Console, or use the fastlane lane with a Play
service account key (`PLAY_STORE_JSON_KEY`, default
`play-store-service-account.json`):

```
bundle exec fastlane android upload_play_store
```

It defaults to the **internal** track as a **draft**, and skips store listing
metadata. Override with `PLAY_TRACK`, `PLAY_RELEASE_STATUS`, and
`PLAY_UPLOAD_METADATA=1`.

### Before the first submission

* Verify 16 KB page size support (required for new submissions targeting API 35):
  `bundletool` / Google's alignment checker over the bundled `.so` files.
* Remove `SYSTEM_ALERT_WINDOW` from the manifest if nothing uses it — it attracts
  extra policy review.
* `fastlane/metadata/android/en-US/full_description.txt` mentions "iOS multi-layer
  encryption"; reword for the Play listing.
