# File Metadata Extractor

Extracts basic metadata from a local file: JPEG EXIF tags (camera make/
model, software, orientation, date) and PDF `/Info` dictionary fields
(title, author, producer, creator, dates).

- **Category:** media
- **Sensitive data:** no — see [Why GPS data is excluded](#why-gps-data-is-excluded) below.
- **Requires consent:** no
- **Requires API key:** no — this plugin never makes a network call; it
  only reads a file already on disk.

## Input

A local file path, ending in `.jpg`, `.jpeg`, or `.pdf`.

## Output shape

```json
{
  "success": true,
  "data": {
    "path": "/path/to/photo.jpg",
    "format": "jpeg",
    "sizeBytes": 48213,
    "metadata": {
      "make": "Canon",
      "model": "EOS 90D",
      "software": "Adobe Lightroom",
      "dateTime": "2026:03:11 14:02:07",
      "hasGpsData": true
    }
  },
  "provenance": {
    "plugin": "metadata-extractor",
    "pluginVersion": "1.0.0",
    "sources": ["local file"]
  },
  "timestamp": "2026-08-09T12:00:00.000Z",
  "confidence": 1
}
```

## Why GPS data is excluded

JPEG EXIF can embed a GPS IFD with the exact coordinates a photo was
taken at. This plugin detects whether that data is present
(`hasGpsData: true`/`false`) but deliberately never decodes or returns
the coordinates themselves — that's location data about wherever the
photo was taken, which is out of scope for a `sensitiveData: false`
plugin. A future plugin that needs the actual coordinates should be
built with `sensitiveData: true` and `requiresConsent: true`, wired
through `core/consent-manager.js` like any other sensitive module (see
[docs/ETHICS.md](../../docs/ETHICS.md)) — not added quietly to this one.

## Known limitations

- JPEG parsing only looks at the first APP1/Exif segment of a standard
  baseline JPEG. Non-standard files (unusual marker ordering before
  APP1) may not parse; the plugin returns `metadata: { hasGpsData: false }`
  in that case rather than failing.
- PDF metadata extraction is regex-based against the plaintext `/Info`
  dictionary. It works for PDFs produced with an uncompressed trailer
  (common for simply-generated PDFs) but will not find metadata in PDFs
  using compressed object streams or hex-string (`<...>`) values — this
  is a real gap, not just an edge case, for many modern PDF writers.
- Reading a missing or unreadable file returns
  `{ success: false, error: "Could not read file: ..." }` rather than
  throwing.

## Run it

```sh
node cli.js metadata-extractor /path/to/photo.jpg
node cli.js metadata-extractor /path/to/document.pdf
```
