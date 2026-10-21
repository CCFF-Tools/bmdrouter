# Video Router Matrix — Windows helper

Portable preview for Windows 10/11 x64 and the Smart Videohub 12G 40×40. No Node.js installation, build tools, or Blackmagic software is required. The helper includes its own runtime and opens the interface in your browser. A physical router is required for actual control.

## Start

1. Download `Video-Router-Matrix-Windows-x64.zip` from https://github.com/CCFF-Tools/bmdrouter/releases.
2. Right-click the ZIP and choose **Extract All**. Open the extracted folder.
3. Double-click **Start Video Router Matrix.cmd**. Keep its console window open while working. Close that window to stop the helper.
4. Your default browser opens the local interface. If it does not, use the address printed in the helper window.
5. Enter the router's IP address and click **Connect**, or expand **Find a router on this network**, select your wired network adapter, and click **Find routers**.
6. The circle turns green only after a complete 40×40 Videohub state is received. A red circle means disconnected. The helper checks the connection every five seconds; a failed check disconnects after four seconds.

The PC must be able to reach the router on TCP port 9990. The helper does not change router network settings. Discovery checks up to 254 addresses in the selected adapter's local /24, restricted to its actual subnet. Enter an IP manually for a router outside that range. Automatic discovery is user-initiated and supports private/link-local IPv4 addresses. Public IPs, DNS names, IPv6, and automatic reconnection are not supported in this preview.

This is an unsigned portable preview, not a signed Windows installer. Windows launch/runtime behavior is checked by the Windows build workflow. Real Smart Videohub acceptance still needs verification on hardware.

## Move existing documentation

The GitHub Pages site and the helper have separate browser storage. On the site, choose **Export backup**. In the helper's browser window, choose **Import backup** and review the replacement. Use the same browser profile for subsequent sessions. Data survives helper restarts, but clearing browser data removes it; export backups regularly.

## Pull and back up the router

Click **Pull from router**, review the label/routing differences, then **Update documentation**. This imports all 80 labels and all 40 routes while preserving the documentation's router name, locations, and notes.

- **Export backup** saves the complete app documentation as JSON.
- **Videohub files → Full configuration → Export full configuration** saves all 80 labels and 40 routes as documented Ethernet protocol blocks. It excludes locks, network settings, and other device settings.
- **Export label set** creates the separate native Videohub Setup label-set format. Its existing character restrictions still apply.

## Restore or send

Import a JSON backup, label set, routing file, or full configuration first. Imports update documentation only. Then choose:

- **Send labels**: updates input/output names, including blank labels; leaves routing unchanged.
- **Send full routing table**: updates video routes; leaves labels unchanged. All 40 outputs must have a documented source. Pull first if you only have a partial routing file, then import that file over the pulled routing.
- **Send labels & routing**: applies both from the current documentation.

Every send shows the target IP and exact differences before **Send to router**. Only changed values are transmitted. Previews expire after two minutes. The helper rechecks the router before sending and rejects a preview if its affected values or connection changed. It never unlocks outputs, including locks owned by this computer's address. Changes are confirmed by reading the router back, not by an ACK alone.

The protocol cannot provide an atomic multi-block transaction. If a connection fails, a command is rejected, or another controller makes conflicting changes, some changes may already have applied. The helper reports this, does not retry automatically, and requires you to pull and review before retrying. Readback proves the observed state at that point; another controller can change it later.

## Direct control

Expand **Live routing / direct control** to see current sources and locks. Choose an input and output, click **Change route…**, review, and send. A verified change also updates that single documented route. The live table updates from router notifications independently of the saved documentation. Editing the main Matrix stages documentation changes; use **Send full routing table** to apply them.

## Troubleshooting

- Red status: check the router's IP, the PC's network adapter, network isolation/firewall rules for outbound TCP 9990, and that the helper window is open.
- No discovered router: enter its IP manually; discovery is bounded and does not scan every subnet or VLAN.
- Locked output: resolve the lock in your normal router workflow, then preview again.
- Port already in use: the helper may already be running. Use the address shown in the console or close the previous instance.
- Unsupported device: this release requires a complete 40-input/40-output device using Videohub protocol major version 2.
- Label differences after a send: pull and check the router's accepted characters/length. The helper does not silently truncate names.

## Implementation and validation

The helper serves the static app and a small HTTP API on loopback `127.0.0.1:49340` only. The router connection uses TCP 9990. Exact Host/Origin checks, no cross-origin access, a custom request header, and an ephemeral per-launch API token restrict control to the local helper page. The token stays in browser memory. No cloud account or runtime internet connection is required; the optional web font falls back to a system font offline.

Development: run `node helper/main.js` with Node.js 24, and `npm test` for protocol/API/file tests. The simulator tests include fragmented responses, Unicode/blank labels, locks, stale previews, NAK, ACK-without-change, heartbeat failure, and HTTP origin/token enforcement. Browser testing covers previews, pulls, sends, direct routes, file import/export, dark mode, and mobile layout. The simulator is not included in the Windows distribution.

Packaging: `powershell -ExecutionPolicy Bypass -File helper/build-windows.ps1` builds the portable ZIP on Windows. The build pins Node.js 24.19.0 x64 and verifies its official ZIP SHA-256 before bundling `node.exe` and its license. The GitHub **Windows helper** workflow runs tests, packages the helper, smoke-tests the bundled Windows runtime/server, and uploads the ZIP with its checksum. The source tag and published checksum identify each preview release. This helper is independent software and is not supplied by Blackmagic Design.

Maintainers can manually dispatch **Windows helper** with **publish** enabled and a new `vX.Y.Z-windows-preview` tag to publish the verified package as a GitHub prerelease. Normal pushes only build test artifacts.
