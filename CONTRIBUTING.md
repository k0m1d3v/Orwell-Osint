# Contributing to Orwell OSINT

Not open for outside contribution yet — see the note in
[README.md](README.md#contributing). This document exists ahead of that so
the standards are settled before anyone's first PR lands, not improvised
in review. Everyone contributing is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Coding standards

- Node.js >= 18, ES modules (`import`/`export`, not `require`).
- Run `npm run lint` and `npm test` before opening a PR — both run in CI
  on every PR, so a failing one blocks review.
- No new runtime dependencies without a reason in the PR description.
  This project's core has zero runtime dependencies by design; keep it
  that way unless there's a real need.
- Favor clarity over cleverness, especially in `core/` — it's the first
  thing a new contributor reads to understand the whole project.
- No commented-out code, no TODOs without an associated issue.

## Submitting a plugin

Full walkthrough, with the actual reasoning behind each step:
**[docs/PLUGIN_DEVELOPMENT.md](docs/PLUGIN_DEVELOPMENT.md)**. This section
is just the review-facing checklist — read that doc first if you're
building your first plugin.

A plugin PR should include:

- [ ] `plugins/<id>/plugin.json`, `index.js`, and `README.md`
- [ ] Folder name matches the manifest's `id`
- [ ] `sensitiveData` and `requiresConsent` in the manifest reflect what
      the plugin actually does — not the most convenient value to ship
      with
- [ ] `index.js` default-exports a class extending `OsintPlugin`
      (`core/plugin-interface.js`) and implements both `validate()` and
      `run()`
- [ ] `run()` always resolves the standard result shape (`success`,
      `data`, `provenance`, `timestamp`, `confidence`) — never throws for
      expected failure modes (rate limited, not found, etc.)
- [ ] Any outbound HTTP call has an injectable seam (see `username-enum`'s
      `config.fetchImpl` for the pattern) so tests don't depend on network
      access or a live third-party API
- [ ] Tests under `test/` covering `validate()` and `run()`, passing via
      `npm test` without network access
- [ ] Plugin `README.md` documents input, output shape, and known
      limitations (rate limits, auth requirements, accuracy caveats)

## Stricter review for `sensitiveData: true` plugins

Anything that touches location data, personal identifiers, or aggregated
personal data — geolocation lookups, breach/leak data, phone/email
lookups, and similar — gets a higher bar than a normal PR. Per
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), this project enforces these
constraints in the architecture, not just in review comments, but review
still has to confirm the plugin actually uses that architecture correctly:

- [ ] `sensitiveData: true` **and** `requiresConsent: true` are both set
      in the manifest — a plugin that returns sensitive data without
      requiring consent is a bug, not a style choice
- [ ] The plugin does not bypass `core/consent-manager.js` in any code
      path — consent must be checked before the plugin's `run()` can
      reach a live data source, with no flag or config option that skips
      it
- [ ] The plugin pulls only from the data source's declared, public/
      legitimate API — no scraping around authentication walls or rate
      limits to get data the API itself wouldn't return
- [ ] The plugin does not add automated cross-referencing designed to
      deanonymize or track a specific individual without their knowledge,
      even if the underlying API would technically allow it — this is out
      of scope for the project regardless of feasibility (see
      [docs/ETHICS.md](docs/ETHICS.md))
- [ ] Rate limiting appropriate to the third-party API's ToS is in place
- [ ] Tests demonstrate the consent gate actually blocks execution when
      consent is denied (see `test/pipeline.test.js` for the pattern)

`sensitiveData: true` plugins are merged only with direct maintainer
review, regardless of how the rest of the review pipeline evolves.

## Reporting bugs and proposing features

Use the issue templates under `.github/ISSUE_TEMPLATE/` — bug report,
feature request, or new plugin proposal, depending on what you're raising.
