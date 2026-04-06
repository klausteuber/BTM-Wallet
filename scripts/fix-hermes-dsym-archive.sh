#!/bin/zsh

set -euo pipefail

if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [path-to.xcarchive]" >&2
  exit 1
fi

archive_path="${1:-}"

if [[ -z "${archive_path}" ]]; then
  archive_path="$(
    find "${HOME}/Library/Developer/Xcode/Archives" -type d -name '*.xcarchive' -print0 \
      | xargs -0 stat -f '%m %N' \
      | sort -n \
      | tail -n 1 \
      | cut -d' ' -f2-
  )"
fi

if [[ -z "${archive_path}" || ! -d "${archive_path}" ]]; then
  echo "Could not find an .xcarchive to patch." >&2
  exit 1
fi

app_path="$(find "${archive_path}/Products/Applications" -maxdepth 1 -type d -name '*.app' | head -n 1)"

if [[ -z "${app_path}" ]]; then
  echo "Could not find an app bundle inside ${archive_path}." >&2
  exit 1
fi

hermes_binary="${app_path}/Frameworks/hermes.framework/hermes"

if [[ ! -f "${hermes_binary}" ]]; then
  echo "Could not find Hermes at ${hermes_binary}." >&2
  exit 1
fi

output_dsym="${archive_path}/dSYMs/hermes.framework.dSYM"
rm -rf "${output_dsym}"
mkdir -p "$(dirname "${output_dsym}")"

echo "Generating Hermes dSYM for:"
echo "  ${archive_path}"

dsymutil "${hermes_binary}" -o "${output_dsym}"

echo "Done. UUIDs in generated dSYM:"
dwarfdump --uuid "${output_dsym}"
