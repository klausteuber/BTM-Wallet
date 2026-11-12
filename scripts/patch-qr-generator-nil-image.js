#!/usr/bin/env node
/**
 * rn-qr-generator 1.4.3 (iOS) detect(): when the `uri` image can't be loaded
 * (file moved, not downloaded from iCloud, bad encoding), it falls back to
 * options.base64. Our callers pass only `uri`, so base64 is nil and
 * -[NSData initWithBase64EncodedString:options:] throws (BugSnag:
 * NSInvalidArgumentException "nil string argument" at RNQrGenerator.m:209
 * -[RNQrGenerator imageFromBase64:], 7.3.2, Nov 2026).
 *
 * Return nil for a missing path/base64 so detect() reaches its own
 * "QRCode uri or base64 are missing" failure callback, which every JS caller
 * already catches.
 *
 * Idempotent; runs from `npm run patches` (postinstall), including in CI.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'rn-qr-generator', 'ios', 'RNQrGenerator.m');

if (!fs.existsSync(file)) {
  console.log('patch-qr-generator-nil-image: rn-qr-generator not installed, skipping');
  process.exit(0);
}
let source = fs.readFileSync(file, 'utf8');
if (source.includes('/* abtm: nil guard */')) {
  console.log('patch-qr-generator-nil-image: already patched');
  process.exit(0);
}
const edits = [
  [
    '- (UIImage *)imageFromPath:(NSString *)path\n{\n',
    '- (UIImage *)imageFromPath:(NSString *)path\n{\n    if (path.length == 0) return nil; /* abtm: nil guard */\n',
  ],
  [
    '- (UIImage *)imageFromBase64:(NSString *)base64String\n{\n',
    '- (UIImage *)imageFromBase64:(NSString *)base64String\n{\n    if (base64String.length == 0) return nil; /* abtm: nil guard */\n',
  ],
];
for (const [from, to] of edits) {
  if (!source.includes(from)) {
    console.error('patch-qr-generator-nil-image: anchor not found; library changed, re-check the crash');
    process.exit(1);
  }
  source = source.replace(from, to);
}
fs.writeFileSync(file, source);
console.log('patch-qr-generator-nil-image: guarded imageFromPath/imageFromBase64 against nil');
