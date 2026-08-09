# [Plugin] Wayback Machine / Archive.org Lookup

**Labels:** `good-first-issue`, `help-wanted`, `module:social`

## What this plugin should do

Add `plugins/wayback-lookup/`: given a URL, check whether the Internet
Archive's Wayback Machine has archived snapshots of it, and return the
earliest, latest, and a small sample of snapshot timestamps.

- **Input:** a URL string (e.g. `https://example.com/some/page`)
- **Output (`data`):** something like:
  ```json
  {
    "url": "https://example.com/some/page",
    "archived": true,
    "firstSnapshot": { "timestamp": "20100113000000", "url": "https://web.archive.org/web/20100113000000/https://example.com/some/page" },
    "latestSnapshot": { "timestamp": "20260801000000", "url": "https://web.archive.org/web/20260801000000/https://example.com/some/page" },
    "snapshotCount": 42
  }
  ```

## Implementation notes

- The Wayback Availability API (`https://archive.org/wayback/available?url=...`)
  gives you a single "closest" snapshot cheaply — good for `archived`/
  `latestSnapshot`. For `firstSnapshot` and `snapshotCount`, the CDX API
  (`https://web.archive.org/cdx/search/cdx?url=...&output=json`) gives
  you the full list of captures; both are plain public JSON endpoints,
  same `fetch` pattern as `username-enum`.
- CDX results can be large for popular URLs — cap how many rows you fetch
  or process (the API supports a `&limit=` parameter) and document the
  cap.
- `archived: false` (no snapshots found) is a normal, valid result — not
  a failure.
- Category: `social` (matches how this is grouped in the plan's backlog —
  §4 "Social & Content"). `sensitiveData: false`, `requiresConsent: false`
  — this only surfaces that a URL was publicly archived and when, not any
  content beyond what the Wayback Machine already makes public.

## Acceptance criteria

See [docs/PLUGIN_DEVELOPMENT.md](../PLUGIN_DEVELOPMENT.md) and
[plugins/username-enum/](../../plugins/username-enum/) as the reference
implementation.

- [ ] `plugins/wayback-lookup/plugin.json`, `index.js`, `README.md`
- [ ] `validate()` rejects non-URL input before any network call
- [ ] `run()` always resolves the standard shape; "never archived" is
      `{ success: true, data: { archived: false, ... } }`, not a failure
- [ ] `config.fetchImpl` is injectable so tests don't depend on
      archive.org being reachable
- [ ] README documents the CDX row cap and which two endpoints are used
      for what
- [ ] Tests pass via `npm test` without network access
