#!/bin/bash
set -euo pipefail
if [ "$(uname -s)" != Darwin ]; then
  printf '%s\n' 'Build this package on macOS (ditto preserves executable permissions in the ZIP).' >&2
  exit 1
fi
architecture="${1:-}"
case "$architecture" in
  arm64) expected_hash='8294b7aa9b03997481c06babf1e8b270c859358f27da57a11509afe537ac381d' ;;
  x64) expected_hash='d1b5e999db158c62fe8f7267a4476b035d8bd93b1a605bac24a3f0dd166e3316' ;;
  *) printf '%s\n' 'Usage: bash helper/build-macos.sh arm64|x64' >&2; exit 1 ;;
esac
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
dist_root="$repo_root/dist"
package_name="Video-Router-Matrix-Mac-$architecture"
package_root="$dist_root/$package_name"
node_version='24.19.0'
mkdir -p "$dist_root"
runtime_temp="$(mktemp -d "$dist_root/mac-runtime.XXXXXX")"
trap 'rm -rf "$runtime_temp"' EXIT
runtime_archive="node-v$node_version-darwin-$architecture.tar.gz"
curl --fail --show-error --location --retry 3 "https://nodejs.org/dist/v$node_version/$runtime_archive" -o "$runtime_temp/$runtime_archive"
actual_hash="$(shasum -a 256 "$runtime_temp/$runtime_archive" | awk '{print $1}')"
if [ "$actual_hash" != "$expected_hash" ]; then
  printf '%s\n' 'Node runtime checksum mismatch.' >&2
  exit 1
fi
tar -xzf "$runtime_temp/$runtime_archive" -C "$runtime_temp"
rm -rf "$package_root"
mkdir -p "$package_root/runtime" "$package_root/helper"
cp "$runtime_temp/node-v$node_version-darwin-$architecture/bin/node" "$package_root/runtime/node"
cp "$runtime_temp/node-v$node_version-darwin-$architecture/LICENSE" "$package_root/runtime/LICENSE.txt"
for file in index.html style.css app.js model.js matrix.js theme.js file-controls.js videohub-files.js helper-controls.js package.json; do
  cp "$repo_root/$file" "$package_root/"
done
for file in main.js server.js protocol.js control.js discovery.js; do
  cp "$repo_root/helper/$file" "$package_root/helper/"
done
cp "$repo_root/helper/Start Video Router Matrix.command" "$package_root/"
cp "$repo_root/docs/macos-helper.md" "$package_root/READ ME.txt"
chmod 755 "$package_root/runtime/node" "$package_root/Start Video Router Matrix.command"
zip_path="$dist_root/$package_name.zip"
rm -f "$zip_path"
/usr/bin/ditto -c -k --sequesterRsrc --keepParent "$package_root" "$zip_path"
(cd "$dist_root" && shasum -a 256 "$package_name.zip" > "$package_name.zip.sha256")
printf 'Created %s\n' "$zip_path"
