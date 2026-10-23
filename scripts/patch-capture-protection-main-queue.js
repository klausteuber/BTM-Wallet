#!/usr/bin/env node
/**
 * react-native-capture-protection 2.0.7 (iOS) declares no methodQueue, so React
 * Native calls its exported methods on a background module queue, while the
 * module's own app-switcher observers run on the main thread. Both read and
 * write the shared static protectionViewConfig, and allow() hides a UIWindow off
 * the main thread. When a protected screen closes as the app moves to or from the
 * background, the two collide and Swift traps (BugSnag: EXC_BREAKPOINT at
 * CaptureProtection.swift:449 in removeAppSwitcherView, from allowAppSwitcher,
 * 7.3.1, Oct 2026). Screens that use useScreenProtect: wallet export / backup,
 * addresses, xpub, import, multisig.
 *
 * Run every exported method on the main queue, as UIKit requires; that also
 * serializes all access to the shared state.
 *
 * Idempotent; runs from `npm run patches` (postinstall), including in CI.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-capture-protection',
  'ios',
  'CaptureProtection',
  'CaptureProtection.swift',
);

if (!fs.existsSync(file)) {
  console.log('patch-capture-protection: react-native-capture-protection not installed, skipping');
  process.exit(0);
}
const source = fs.readFileSync(file, 'utf8');
if (source.includes('override var methodQueue')) {
  console.log('patch-capture-protection: already runs on the main queue');
  process.exit(0);
}
const anchor = 'class CaptureProtection: RCTEventEmitter {\n    private var hasListeners = false\n';
if (!source.includes(anchor)) {
  console.error('patch-capture-protection: CaptureProtection.swift changed, update this patch');
  process.exit(1);
}
const methodQueue =
  '    // Patched by scripts/patch-capture-protection-main-queue.js: UIKit work must run on main.\n' +
  '    @objc override var methodQueue: DispatchQueue! {\n' +
  '        DispatchQueue.main\n' +
  '    }\n';
fs.writeFileSync(file, source.replace(anchor, `${anchor}${methodQueue}`));
console.log('patch-capture-protection: exported methods now run on the main queue');
