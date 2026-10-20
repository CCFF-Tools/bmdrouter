# Video Router Matrix

A browser-based documentation tool for a Blackmagic Design VideoHub 40×40. Label all 40 inputs and 40 outputs, add locations and notes, search, print the full port list, and import/export JSON backups. This tool does not connect to or control a router.

## Views

- **Edit**: update labels, locations, notes, and the router name.
- **List**: read-only port list with notes shown inline.
- **Grid**: read-only numbered port tiles, with unlabeled ports visually distinguished. This is a port inventory, not a live routing crosspoint matrix.

All three views share data and support search, input/output selection, and the unlabeled filter. Printing always produces the full read-only list.

## Run

From `/workspace/bmdrouter`, run `npm start` (Python 3 required), then open the server on port 3000 in your browser. No dependency installation or build is required. Run `npm test` with Node.js 18+ for backup validation tests.

Data saves automatically in this browser's local storage for this site address. It is not shared between browsers or devices. Export backups regularly; clearing browser data removes saved documentation. Import validates the complete file and asks before replacing the current port list. Printing includes all 80 ports regardless of active filters.

The interface works without external services. An optional Google font falls back to the system font when unavailable.

## GitHub Pages

This app can be served directly by GitHub Pages without a build. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/ (root)**, and save. The expected address is `https://ccff-tools.github.io/bmdrouter/`; it is available only after GitHub finishes publishing.

The published site does not contain your port documentation: entered data stays in each visitor's browser unless they export and share a backup. Hosting a private repository on Pages may require a qualifying GitHub plan. The repository does not need to be made public when that plan supports Pages for private repositories.
