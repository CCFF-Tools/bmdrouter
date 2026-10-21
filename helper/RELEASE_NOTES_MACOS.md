Portable Mac preview with the same router controls and file formats as the Windows helper.

### Choose your download

- **Video-Router-Matrix-Mac-arm64.zip** — Apple silicon (M1, M2, M3, and newer).
- **Video-Router-Matrix-Mac-x64.zip** — Intel Macs.

Requires macOS 13.5 or later. No Homebrew, Node.js installation, or build tools required.

### Start

1. Download and double-click the ZIP to extract it.
2. Open the extracted folder and double-click **Start Video Router Matrix.command**.
3. Keep the Terminal window open. The interface opens in your default browser.
4. Enter the router's IP or use **Find routers**, then start with **Pull from router**.

This is an unsigned, unnotarized portable preview. If macOS blocks the launcher, use the per-file **Open Anyway** option in **System Settings → Privacy & Security** after attempting to open it, if you trust the download. Allow Local Network access for Terminal/helper if macOS asks. See the [Mac guide](https://github.com/CCFF-Tools/bmdrouter/blob/main/docs/macos-helper.md) for details.

### Included

Network discovery, red/green connection status, pulls, separate label/routing sends, combined sends, live routing, individual route changes, and full configuration import/export. Every send has a preview, locked-output protection, stale-state checks, and readback verification.

Existing JSON backups and protocol configuration files work across Windows and Mac. Import a backup from the GitHub Pages site to transfer documentation into the helper. Imports never send to hardware automatically. Full configuration covers labels and video routing; it excludes locks and network settings.

### Validation

Protocol, control, API, and file tests pass on native Apple silicon and Intel macOS runners. Both extracted packages pass a launcher/runtime/API smoke test, including executable permissions and folder paths with spaces. **Physical Videohub acceptance and Finder/Gatekeeper first-launch prompts still need user testing.**

[Browser app](https://ccff-tools.github.io/bmdrouter/) · [Mac guide](https://github.com/CCFF-Tools/bmdrouter/blob/main/docs/macos-helper.md)
