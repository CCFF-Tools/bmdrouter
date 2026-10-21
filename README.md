# Video Router Matrix

A browser-based documentation tool for a Blackmagic Design VideoHub 40×40. Label all 40 inputs and 40 outputs, add locations and notes, search, print the full port list, and import/export backups. The optional Windows helper adds network discovery, live status, pulls, separate label/routing sends, and direct route control.

## Windows helper

Download the portable x64 ZIP from [Releases](https://github.com/CCFF-Tools/bmdrouter/releases), extract it, and double-click **Start Video Router Matrix.cmd**. It opens the interface in your browser and includes its own runtime; no build or Node.js installation is needed. Connect to the router's IP or use Find routers. See the [Windows guide](docs/windows-helper.md) for transfers, full configuration restore, and limitations.

The helper serves its own local copy of the app. To transfer documentation from GitHub Pages, export a JSON backup on the site and import it in the helper. Without the helper, the published site remains a documentation/file tool. Simulator validation does not replace acceptance testing on a physical Smart Videohub 12G 40×40.

## Blackmagic file exchange

Use **Export label set** to download `Labels Videohub 40x40.txt`, in the headerless, one-based CSV structure used by Videohub Setup → gear icon → **Load label set**. **Import label set** previews changes and preserves notes, locations, and routing. Export includes all 80 ports, regardless of filters. Export rejects uncertain characters rather than silently changing labels.

The separate **Routing files** section imports/exports zero-based `VIDEO OUTPUT ROUTING:` command blocks. **These are not Setup label-set files**; the Windows helper can apply imported routing to hardware. **Full configuration** imports/exports all 80 labels and all 40 routes in protocol format, excluding locks and network settings. Full app JSON backups also preserve locations and notes. Importing a file never sends it automatically.

See [file format evidence and limitations](docs/videohub-file-formats.md). Native Blackmagic software/hardware acceptance has not been verified in this environment.

## Appearance

Use **Dark mode** in the header to switch themes. The app follows your system preference until you choose a theme, then remembers your choice in this browser. Printing always uses the light palette. Theme settings do not change port documentation or backups.

## Views

- **Edit**: update labels, locations, notes, and the router name.
- **List**: read-only port list with notes shown inline.
- **Grid**: read-only numbered port tiles, with unlabeled ports visually distinguished. This is a port inventory, not a live routing crosspoint matrix.

**Matrix** shows all 40 inputs as rows and all 40 outputs as columns. Click a cell to document an output’s source; click it again to clear. Assigning a different input replaces that output’s previous source. One input can feed multiple outputs. Use arrow keys to move between cells and Space/Enter to toggle. Headers stay visible as you scroll. This view always shows all ports, independently of list filters. Documented routes save locally and in version 2 backups; version 1 backups still import, with empty routes. List/Grid output entries and printed lists show assigned sources.

Edit, List, and Grid share data and support search, input/output selection, and mutually exclusive Labeled only / Unlabeled only filters. Printing always produces the full read-only list.

## Run

From `/workspace/bmdrouter`, run `npm start` (Python 3 required), then open the server on port 3000 in your browser. No dependency installation or build is required. Run `npm test` with Node.js 18+ for backup validation tests.

Data saves automatically in this browser's local storage for this site address. It is not shared between browsers or devices. Export backups regularly; clearing browser data removes saved documentation. Import validates the complete file and asks before replacing the current port list. Printing includes all 80 ports regardless of active filters.

The interface works without external services. An optional Google font falls back to the system font when unavailable.

## GitHub Pages

This app can be served directly by GitHub Pages without a build. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/ (root)**, and save. The expected address is `https://ccff-tools.github.io/bmdrouter/`; it is available only after GitHub finishes publishing.

The published site does not contain your port documentation: entered data stays in each visitor's browser unless they export and share a backup. Hosting a private repository on Pages may require a qualifying GitHub plan. The repository does not need to be made public when that plan supports Pages for private repositories.
