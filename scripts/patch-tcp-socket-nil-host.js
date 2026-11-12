#!/usr/bin/env node
/**
 * react-native-tcp-socket 6.3.0 (iOS) builds its connect/listening/connection
 * event bodies with NSDictionary literals that read [socket localHost] and
 * [socket connectedHost] directly. GCDAsyncSocket returns nil for both once the
 * socket has dropped. With TLS (our Electrum connections), socketDidSecure ->
 * onConnect can run after the server has already closed the connection, so the
 * literal gets a nil value and Foundation throws (BugSnag:
 * NSInvalidArgumentException "attempt to insert nil object from objects[0]"
 * at TcpSockets.m:225 -[TcpSockets onConnect:], 7.3.2, Nov 2026).
 *
 * Fall back to NSNull so the event is still sent (JS reads null) and the
 * following close/error event tears the socket down normally.
 *
 * Idempotent; runs from `npm run patches` (postinstall), including in CI.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'react-native-tcp-socket', 'ios', 'TcpSockets.m');

if (!fs.existsSync(file)) {
  console.log('patch-tcp-socket-nil-host: react-native-tcp-socket not installed, skipping');
  process.exit(0);
}
let source = fs.readFileSync(file, 'utf8');
if (source.includes('(id)[NSNull null]')) {
  console.log('patch-tcp-socket-nil-host: already patched');
  process.exit(0);
}
const targets = ['[socket localHost]', '[socket connectedHost]'];
let count = 0;
for (const t of targets) {
  const parts = source.split(t);
  count += parts.length - 1;
  source = parts.join(`(${t} ?: (id)[NSNull null])`);
}
if (count === 0) {
  console.error('patch-tcp-socket-nil-host: no host reads found; library changed, re-check the crash');
  process.exit(1);
}
fs.writeFileSync(file, source);
console.log(`patch-tcp-socket-nil-host: guarded ${count} host reads against nil`);
