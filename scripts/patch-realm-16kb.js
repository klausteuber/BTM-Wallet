#!/usr/bin/env node
/**
 * Google Play rejects Android updates whose native libraries are not aligned for
 * 16 KB memory pages (Android 15+). realm 20.1.0 links librealm.so with the NDK
 * default 4 KB alignment; realm 20.2.0 fixed it with this exact linker flag, but
 * that release also migrates realm to a TurboModule aimed at React Native 0.80.
 * Until the app moves to RN 0.80, add the one flag to realm 20.1.0's build.
 *
 * Idempotent; runs from `npm run patches` (postinstall), including in CI.
 */
const fs = require('fs');
const path = require('path');

const FLAG = 'set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,-z,max-page-size=16384")';
const file = path.join(__dirname, '..', 'node_modules', 'realm', 'binding', 'android', 'CMakeLists.txt');

if (!fs.existsSync(file)) {
  console.log('patch-realm-16kb: realm not installed, skipping');
  process.exit(0);
}
const source = fs.readFileSync(file, 'utf8');
if (source.includes('max-page-size=16384')) {
  console.log('patch-realm-16kb: already aligned for 16 KB pages');
  process.exit(0);
}
const anchor = 'set(CMAKE_INTERPROCEDURAL_OPTIMIZATION OFF)';
if (!source.includes(anchor)) {
  console.error('patch-realm-16kb: realm CMakeLists.txt changed, update this patch');
  process.exit(1);
}
fs.writeFileSync(file, source.replace(anchor, `${FLAG}\n${anchor}`));
console.log('patch-realm-16kb: added 16 KB page alignment to librealm.so');
