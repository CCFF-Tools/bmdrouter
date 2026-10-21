# Videohub file formats and evidence

Researched 2026-10-21. The app remains entirely browser based and sends nothing to the router.

## Videohub Setup: Load label set

The label set is headerless comma-separated text, saved with a `.txt` extension. Input records precede output records, using one-based physical port numbers:

```text
Input,1,Camera 1
Input,2,
Output,1,Monitor 1
Output,2,
```

Export lists every input and output (40 of each), with CRLF separators and no final newline. It contains labels only, not routes, notes, locations, locks, or network settings. Filtering the on-screen list does not filter the exported file. Blank label entries are included; review changes in Videohub Setup before saving to hardware.

Sources:

- [Blackmagic Videohub installation manual](https://documents.blackmagicdesign.com/UserManuals/Videohub12GInstallation.pdf), printed page 26: saving, text editing, and loading label sets through the Setup gear menu.
- [RouteEffect: Exporting Configuration](https://docs.routeeffect.com/import-and-export/exporting-configuration), “Label Set”: a complete 20×20 example using `Input, 1, label` / `Output, 1, label`, explicitly identified as suitable for Videohub Setup's Load Label Set.
- [Videohub File Generator](https://github.com/JayDeli/videohub-generator), README and label-set format notes: reports comparison against Setup-saved 40×40 and 120×120 files; one-based CSV without a header, inputs before outputs, CRLF, and no trailing newline. Used as interoperability evidence, not copied implementation code.

Compatibility limits: native-software acceptance has not been exercised here on Windows/Mac or a physical router. Export conservatively rejects non-ASCII characters, commas, quotes, and control characters rather than guessing CSV escaping or silently changing names. This limitation applies only to label-set export, not the app's own storage/JSON backups. The protocol manuals do not establish CSV quoting, CSV encoding, or label-length limits. No guessed 18-character limit is applied.

Import accepts UTF-8 and BOM-marked UTF-16 text, LF or CRLF, and the spaced CSV example. It rejects ambiguous fields, duplicate ports, and out-of-range ports. Only listed labels change; all other app data is preserved. A preview and confirmation precede applying changes.

## Routing files

`VIDEO OUTPUT ROUTING:` is an Ethernet protocol block. Each record is `output input`, both **zero-based**. For example, physical Output 1 routed from Input 6 is `0 5`. The block ends with a blank line.

Sources:

- [Blackmagic Videohub Ethernet Protocol](https://documents.blackmagicdesign.com/DeveloperManuals/VideohubEthernetProtocol.pdf), “Initial Status Dump” and “Requesting Changes”. The user-supplied copy has identical extracted text to the official download.
- [Blackmagic Videohub Developer Information](https://documents.blackmagicdesign.com/DeveloperManuals/VideohubDeveloperInformation.pdf), “Saving and Loading Labels with Telnet”. This describes network commands, not the Setup label-set file. The user-supplied copy also matches the official download.
- [RouteEffect: Backing up a Videohub](https://docs.routeeffect.com/import-and-export/backing-up-a-videohub): complete protocol snapshot and command restoration example.

The app can import/export routing commands and extract routes from a protocol snapshot. It does not export lock overrides or network settings. Unassigned outputs are omitted; it does not invent a disconnect command. Import updates only listed output assignments, retaining other routes and all labels/notes/locations. Other protocol sections are reported as ignored; non-40×40 snapshots are rejected.

**No native Blackmagic Setup routing-file importer was established. Load label set imports labels only.** The routing export requires an external protocol-capable sender to affect hardware and is labeled accordingly. It is not presented as a native Setup configuration file.
