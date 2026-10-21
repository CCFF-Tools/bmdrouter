# Video Router Matrix — Mac helper

Portable preview for macOS 13.5 or later and the Smart Videohub 12G 40×40. Includes its own runtime; no Homebrew, Node.js installation, Blackmagic software, or build tools are needed. The helper runs locally and opens the interface in your browser.

## Download and start

1. Choose **Apple menu → About This Mac**. A **Chip** entry (M1, M2, M3, etc.) means Apple silicon. An **Intel processor** means Intel.
2. From https://github.com/CCFF-Tools/bmdrouter/releases/tag/v0.1.0-macos-preview, download **Video-Router-Matrix-Mac-arm64.zip** for Apple silicon or **Video-Router-Matrix-Mac-x64.zip** for Intel.
3. Double-click the ZIP to extract it. Keep the entire extracted folder together, including the `runtime` and `helper` folders.
4. Double-click **Start Video Router Matrix.command**. Terminal opens and the helper launches your default browser. Keep that Terminal window open while working; press Control-C in it to stop the helper.
5. Enter the router's IP address and click **Connect**, or expand **Find a router on this network**, select your network adapter, and click **Find routers**.
6. Start with **Pull from router** to review the existing labels and routes. A green connection circle means the helper received a complete 40×40 router state.

This preview is not signed or notarized as a Mac application. If macOS blocks the launcher, attempt to open it once, then use **System Settings → Privacy & Security → Open Anyway** for this downloaded helper if you trust it. On a managed Mac, your administrator may need to approve it. No global Gatekeeper changes or Terminal security commands are required by these instructions.

If macOS requests **Local Network** access for Terminal or the helper, allow it to reach the router. You can review this under **System Settings → Privacy & Security → Local Network** on macOS versions that provide that setting. If the browser does not open, use the local address printed in Terminal.

## Features and files

The Mac helper has the same controls as the Windows helper:

- Router discovery, red/green connection status, and live routing/lock display.
- Pull all 80 labels and 40 routes, preserving your documentation's router name, locations, and notes.
- Separate **Send labels**, **Send full routing table**, and **Send labels & routing** actions.
- **Live routing / direct control** for individual route changes.
- Import/export of label sets, routing, full configuration, and JSON backups.
- Preview before every send, locked-output protection, stale-state checks, and verification by reading back the router.

Files work across the Mac and Windows helpers. To move existing documentation from GitHub Pages or another computer, **Export backup** there and **Import backup** in the helper's browser window. Each browser profile and site address has separate storage. Export backups regularly.

Importing a file only changes documentation. Use a separate send action to apply it to hardware. Editing the main Matrix also stages documentation; it does not immediately route video. A full routing send requires a source for all 40 outputs. For partial routing files, pull the current routing first, then import the partial file.

Full protocol configuration files contain all input/output labels and video routes. They exclude locks, network settings, and other device settings. JSON backups also preserve notes and locations. Native **Videohub Setup → Load label set** files remain labels-only.

## Network and operating limits

The Mac must reach the router on TCP port 9990. Discovery checks up to 254 addresses near the selected adapter, restricted to its actual subnet. Enter the IP directly for routers on another reachable subnet. This preview accepts private/link-local IPv4 addresses and requires a complete 40-input/40-output device using Videohub protocol major version 2.

The helper listens only on this Mac's loopback address, port 49340. It cannot be opened remotely from another computer. Its local copy of the app works without internet access; the optional font falls back to the system font offline. API requests use the same Host/Origin checks and per-launch token as the Windows helper.

The helper never overrides output locks or automatically retries sends. Videohub does not offer an atomic multi-block transaction: a failed send may have partly applied. Pull and review before retrying. Live state and saved documentation remain separate until you explicitly pull or send.

If Terminal reports a missing runtime, re-extract the complete ZIP. If it reports an incompatible CPU type, download the package for your Mac's processor. If the port is already in use, check whether another helper window is running. Discovery and connection failures can also result from Local Network permission, VPNs, VLANs, or firewall rules.

## Validation and development

The Mac workflow tests each package on its matching native architecture: Apple silicon and Intel macOS runners. It runs protocol/API/file tests, verifies the official runtime archive's SHA-256, builds the ZIP, extracts it into a path containing spaces, and runs the actual launcher with browser opening suppressed for automation. This checks executable permissions, bundled runtime startup, browser assets, and authenticated local API access.

CI does not exercise Finder's first-open Gatekeeper prompts, a real user's Local Network permissions, or a physical Smart Videohub. Hardware acceptance still needs verification. The minimum OS requirement comes from the bundled Node.js 24 runtime; the CI runners use macOS 15.

Maintainers: on macOS, run `bash helper/build-macos.sh arm64` or `bash helper/build-macos.sh x64`. The build pins Node.js 24.19.0 and packages its executable and license. Manually dispatch **Mac helper** with **publish** enabled and a new `vX.Y.Z-macos-preview` tag to publish both verified ZIPs. Normal pushes build test artifacts only. This independent helper is not supplied by Blackmagic Design.
