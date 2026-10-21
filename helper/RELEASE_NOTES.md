Portable Windows preview for Smart Videohub 12G 40×40 control.

### Download and start

1. Download **Video-Router-Matrix-Windows-x64.zip** below.
2. Right-click it and select **Extract All**.
3. Open the extracted folder and double-click **Start Video Router Matrix.cmd**. Keep the helper window open; the interface opens in your browser.
4. Enter your router's IP address, or use **Find routers**. Start with **Pull from router** to review the current labels and routing.

Windows 10/11 x64. Includes its own runtime: no Node.js installation, source checkout, or build tools required. This is an unsigned portable preview.

### Included

- Network discovery and red/green connection status.
- Pull all 80 labels and 40 routes while preserving notes and locations.
- Separate **Send labels**, **Send full routing table**, and combined send actions.
- Live routing display and individual route changes.
- Label-set, routing, full protocol configuration, and JSON backup import/export.
- Preview before sending, lock protection, stale-state checks, and readback verification.

To transfer documentation from the GitHub Pages site, export a backup there and import it in the helper's browser window. The two addresses use separate browser storage.

### Validation and limits

26 automated tests passed on Windows, and the packaged Windows runtime/server passed a smoke test. Browser flows were exercised against a simulated Videohub. **Physical Smart Videohub acceptance has not yet been verified.** This preview supports 40×40 devices using protocol major version 2.

Full configuration means input/output labels and video routes. It excludes locks, network settings, and other device settings. File imports stage changes; they never send automatically. The helper never overrides locks or automatically retries a failed send. A failed send can partially apply: pull and review before retrying.

[Windows guide](https://github.com/CCFF-Tools/bmdrouter/blob/main/docs/windows-helper.md) · [Browser app](https://ccff-tools.github.io/bmdrouter/)
