#!/bin/bash
# Switch the prebuilt Hermes engine between Debug and Release before an Xcode build.
#
# React Native 0.78's "[Hermes] Replace Hermes for the right configuration" build
# phase runs `tar -xf <unquoted path>`, which fails when the checkout path contains
# spaces (".../Chainlogic Database/.../Wallet V2 - kyc link") - and it deletes
# Pods/hermes-engine before it fails. Doing the switch here, with quoted paths, and
# writing the marker it checks makes that phase a no-op.
#
#   scripts/hermes-config.sh Debug     # before a simulator / debug build
#   scripts/hermes-config.sh Release   # before `bundle exec fastlane ios deploy`
set -euo pipefail

CONFIG="${1:-}"
if [ "$CONFIG" != "Debug" ] && [ "$CONFIG" != "Release" ]; then
  echo "usage: $0 Debug|Release" >&2
  exit 2
fi

PODS="$(cd "$(dirname "$0")/../ios/Pods" && pwd)"
LOWER="$(echo "$CONFIG" | tr '[:upper:]' '[:lower:]')"
TARBALL="$(ls "$PODS"/hermes-engine-artifacts/hermes-ios-*-"$LOWER".tar.gz 2>/dev/null | head -1 || true)"
if [ -z "$TARBALL" ]; then
  echo "No $LOWER Hermes tarball in $PODS/hermes-engine-artifacts. Run 'pod install' in ios/ first." >&2
  exit 1
fi

if [ "$(cat "$PODS/.last_build_configuration" 2>/dev/null || true)" = "$CONFIG" ] && [ -d "$PODS/hermes-engine/destroot" ]; then
  echo "Hermes is already $CONFIG."
  exit 0
fi

rm -rf "$PODS/hermes-engine"
mkdir -p "$PODS/hermes-engine"
tar -xf "$TARBALL" -C "$PODS/hermes-engine"
printf '%s' "$CONFIG" > "$PODS/.last_build_configuration"
echo "Hermes switched to $CONFIG ($(basename "$TARBALL"))."
