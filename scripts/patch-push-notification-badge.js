#!/usr/bin/env node
/**
 * react-native-push-notification 8.1.1 (unmaintained) looks up the launcher activity in
 * ApplicationBadgeHelper.setApplicationIconBadgeNumber with
 * getLaunchIntentForPackage(...).getComponent(). On some OEM launchers (Xiaomi HyperOS,
 * Android 16) that call throws a NullPointerException ("class name is null") on the
 * native-modules thread, which crashes the whole app. The JS side no longer calls it on
 * Android, but a crash in a badge count must never take the app down, so catch it here.
 *
 * Idempotent; runs from `npm run patches` (postinstall), including in CI.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-push-notification',
  'android',
  'src',
  'main',
  'java',
  'com',
  'dieam',
  'reactnativepushnotification',
  'helpers',
  'ApplicationBadgeHelper.java',
);

if (!fs.existsSync(file)) {
  console.log('patch-push-notification-badge: react-native-push-notification not installed, skipping');
  process.exit(0);
}
const source = fs.readFileSync(file, 'utf8');
if (source.includes('ABTM: badge failure must not crash')) {
  console.log('patch-push-notification-badge: already patched');
  process.exit(0);
}

const original = `    public void setApplicationIconBadgeNumber(Context context, int number) {
        if (null == componentName) {
            componentName = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName()).getComponent();
        }
        tryAutomaticBadge(context, number);
    }`;

const patched = `    public void setApplicationIconBadgeNumber(Context context, int number) {
        // ABTM: badge failure must not crash the app (NPE on some OEM launchers).
        try {
            if (null == componentName) {
                Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                if (launchIntent == null) {
                    return;
                }
                componentName = launchIntent.getComponent();
            }
            tryAutomaticBadge(context, number);
        } catch (Exception e) {
            FLog.w(LOG_TAG, "Could not set the launcher badge count", e);
        }
    }`;

if (!source.includes(original)) {
  console.error('patch-push-notification-badge: ApplicationBadgeHelper.java changed, update this patch');
  process.exit(1);
}
fs.writeFileSync(file, source.replace(original, patched));
console.log('patch-push-notification-badge: launcher badge errors are now caught');
