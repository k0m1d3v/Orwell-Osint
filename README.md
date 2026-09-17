# Orwell OSINT

Orwell OSINT is an open source intelligence tool built around a plugin
architecture, so it can grow through community contribution rather than a
single team trying to cover every data source. The core is deliberately
small: a plugin contract, a loader, a pipeline, and a consent gate for
sensitive modules. Everything else — WHOIS, breach lookup, geolocation,
whatever comes next — is a plugin.

**This is early.** Three reference plugins ship today, out of a much
larger planned backlog. See [Current status](#current-status) below
before you assume a feature exists.

## Who this is for

Orwell OSINT is built for:

- authorized penetration testers and red teams
- DFIR practitioners and security researchers
- journalists doing public-interest investigative work
- cybersecurity students learning OSINT methodology

It aggregates and correlates information that is already public (public
APIs, public records, public social profiles, public WiFi network
databases like WiGLE). It does not exploit systems, bypass authentication,
access private data, or automate harassment or stalking. See
[docs/ETHICS.md](docs/ETHICS.md) for the full responsible-use policy and
what's explicitly out of scope for this project.

## Quickstart

Requires Node.js >= 18.18.

```sh
npm install
node cli.js username-enum octocat
```

That runs `username-enum`, one of three plugins that ship today, which
checks whether a username exists on a small set of public platforms
(GitHub, GitLab, Reddit, Dev.to) and prints a JSON result:

```json
{
  "success": true,
  "data": {
    "username": "octocat",
    "matches": [{ "site": "GitHub", "found": true, "statusCode": 200 }],
    "checked": [ /* one entry per site checked */ ]
  },
  "provenance": { "plugin": "username-enum", "pluginVersion": "1.0.0", "sources": ["GitHub", "GitLab", "Reddit", "Dev.to"] },
  "timestamp": "2026-08-09T12:00:00.000Z",
  "confidence": 0.25
}
```

Every run is written to a local `audit-log.jsonl` (who/when/which plugin/
which input/outcome — never the data a plugin returned); see
[docs/ETHICS.md](docs/ETHICS.md#enforcement-in-the-architecture).

To export a result instead of printing it, add `--format` and `--out`:

```sh
node cli.js username-enum octocat --format csv --out report.csv
node cli.js username-enum octocat --format pdf --out report.pdf
```

`core/reporting.js` is a generic export layer — it works on any plugin's
result because every plugin returns the same standard shape, not because
it knows anything about `username-enum` specifically.

Run the test suite and linter with:

```sh
npm test
npm run lint
```

## Web UI (prototype)

A Vue 3 + TypeScript frontend lives under `src/`, matching the frontend
architecture described in [ORWELL_OSINT_PLAN.md](ORWELL_OSINT_PLAN.md).
Run it with:

```sh
npm run frontend:dev
```

It covers four screens:

- **Plugin registry** — browse the shipped plugins, filterable by
  category or free text.
- **Run** — a per-plugin input form and a results panel that renders any
  plugin's standard result shape generically (structured view + raw
  JSON), plus a **Configure** panel for plugins that expose extra
  run-time options (today: `username-enum`'s anti-false-positive
  verification and custom sites).
- **Audit trail** — a read-only, filterable view over run history.
- **Settings** — API key status per plugin and a read-only view of each
  plugin's manifest.

**This is UI-only.** There's no HTTP API yet for a browser to call, so
the UI runs entirely against mock data shaped like real plugin output —
it does not drive the actual pipeline in `core/`. A run you make in the
CLI and a run you make in the UI are two independent things right now;
keeping them in sync (e.g. `username-enum`'s custom-site flag) is manual.
`npm run frontend:build` produces a static production build.

## The plugin architecture, in short

Every plugin is a folder under `plugins/` with a manifest (`plugin.json`)
and an implementation (`index.js`) that extends a small base class and
implements two methods: `validate(input)` and `run(input, config)`. The
loader discovers plugins by scanning the folder — there's no central
registry file to edit. Every plugin's `run()` resolves to the same
standard shape (`success`, `data`, `provenance`, `timestamp`,
`confidence`), which is what lets one reporting layer eventually work
across every plugin, present or future, without each one reinventing
export/logging.

Plugins that touch sensitive data declare `sensitiveData: true` and
`requiresConsent: true` in their manifest. That's not a policy note —
`core/consent-manager.js` is wired into the pipeline and blocks execution
of any such plugin until explicit consent is granted, by default via an
interactive CLI prompt. See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) and
[docs/ETHICS.md](docs/ETHICS.md) for the governance reasoning.

Adding a plugin does not require touching core code or routing — the
loader reads everything it needs from the manifest. (The [Web UI](#web-ui-prototype)
doesn't scan `plugins/` yet — its plugin list is mocked — so a new plugin
won't show up there automatically until that's wired up.) In practice, a
well-scoped plugin (an API wrapper with clear input/output) is closer to
an afternoon of work than a big project. See
**[docs/PLUGIN_DEVELOPMENT.md](docs/PLUGIN_DEVELOPMENT.md)** for a full
walkthrough, written from actually building the `username-enum` plugin —
it documents the real steps and real decisions, not a generic template.

## Current status

**v0.1 (shipped):** core plugin contract (`core/plugin-interface.js`,
`plugin-loader.js`, `pipeline.js`), consent enforcement
(`core/consent-manager.js`), a minimal CLI, and plugin development docs.

**v0.2 (shipped):** community infrastructure — README, CODE_OF_CONDUCT,
CONTRIBUTING, issue/PR templates, CI (lint + test), docs/ETHICS.md.

**v0.3 (shipped):** two more reference plugins across different
categories, a generic reporting/export layer, and a persistent audit log:

| Plugin | Category | Sensitive data | Requires API key |
|---|---|---|---|
| `username-enum` | identity | no | no |
| `http-security-headers` | network | no | no |
| `metadata-extractor` | media | no | no |

That's the full feature list today — three plugins across three
categories, zero of them `sensitiveData: true`. Everything else in the
backlog below is planned, not built. A curated batch of `good-first-issue`
tickets for more low-sensitivity plugins exists as drafts under
[docs/issue-drafts/](docs/issue-drafts/), pending review before they go
live as GitHub issues.

**Planned plugin categories and examples** (from the project plan, not yet
implemented): identity (email lookup, breach/leak lookup, phone lookup,
cross-platform correlation), media (reverse image search, face detection),
geolocation (WiGLE, Overpass POI enrichment, IP geolocation), network
(WHOIS, DNS enumeration, Shodan/Censys, certificate transparency), social
(profile aggregation, timeline building, Wayback Machine), documents
(Google dorking, public registry lookup). See
[ORWELL_OSINT_PLAN.md](ORWELL_OSINT_PLAN.md) §4 for the full backlog.

## Roadmap

- **v0.1 — done.** Minimal core + one legible example plugin.
- **v0.2 — done.** Community infrastructure: README, CODE_OF_CONDUCT,
  CONTRIBUTING, issue/PR templates, CI (lint + test), docs/ETHICS.md.
- **v0.3 — done.** Two more reference plugins (`http-security-headers`,
  `metadata-extractor`), a generic export layer (`core/reporting.js`,
  PDF/JSON/CSV), a persistent audit log (`core/audit-log.js`), and drafted
  (not yet live) `good-first-issue` tickets for low-sensitivity plugins.
- **UI prototype — in progress, not versioned.** A Vue 3 + TypeScript
  frontend under `src/` (see [Web UI](#web-ui-prototype)), built ahead of
  the backend HTTP API it will eventually need — it currently runs
  against mock data, not the real `core/` pipeline.
- **v1.0 — next.** WiGLE geolocation and Overpass POI enrichment
  (`sensitiveData: true`, built and reviewed directly by the maintainer),
  case management, and a revisit of contributor docs based on real
  contributor questions.

Full detail: [ORWELL_OSINT_PLAN.md](ORWELL_OSINT_PLAN.md).

## Contributing

Not open for outside contribution yet. A curated batch of
`good-first-issue` tickets exists as drafts (see
[Current status](#current-status)) but hasn't been opened as live GitHub
issues yet. Once it is: [CONTRIBUTING.md](CONTRIBUTING.md) covers coding
standards and how to submit a plugin, and
[docs/PLUGIN_DEVELOPMENT.md](docs/PLUGIN_DEVELOPMENT.md) covers how to
actually build one. All contributors are expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Responsible use

Orwell OSINT is intended for authorized, lawful use only: penetration
testing and red-team engagements you're authorized to perform, DFIR
investigations, public-interest journalism, and security education. Don't
use it to surveil, track, or aggregate information about a specific
individual without authorization or legitimate public-interest cause —
that's out of scope for this project regardless of what's technically
possible with the same public APIs. Full policy:
[docs/ETHICS.md](docs/ETHICS.md).

## License

[AGPL-3.0](LICENSE). Chosen deliberately over a more permissive license:
it prevents someone from silently forking this into a closed-source paid
service, which matters more than usual for a tool with sensitive modules
on its roadmap (geolocation, breach lookup).
