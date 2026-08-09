# Orwell OSINT — Project Plan

## 1. Vision

Orwell OSINT is an open source intelligence tool, rebuilt from scratch with a plugin architecture so it can be extended by the community. **The primary goal is the open-source project itself** — building a healthy community of contributors — not just accumulating features. Feature breadth is secondary to: a clean plugin contract, a genuinely good contributor experience, and responsible governance on sensitive modules (geolocation, breach lookup, etc.).

**Declared target user:** security researchers, authorized pentesters, DFIR professionals, cybersecurity students. State this explicitly in the README to frame legitimate use from the start.

**Tech stack:** Node.js (backend/core), Vue 3 + TypeScript (frontend), plugin-first architecture.

**Why this matters for the plan below:** every phase is ordered so that "can a stranger understand and contribute to this" is solved early, not bolted on at v1.0.

---

## 2. Foundational decisions

| Decision | Choice | Notes |
|---|---|---|
| Name | **Orwell OSINT** | Confirmed |
| License | Choose between MIT/Apache-2.0 vs AGPL-3.0 | AGPL-3.0 prevents someone silently forking it into a closed-source paid service (common approach for tools with sensitive modules, e.g. osint_toolkit). MIT/Apache-2.0 lowers adoption friction — matters more when the goal is community growth. Decide deliberately; this blocks going public. |
| Public repo from day one, or private until v0.1? | To decide | Recommended: private until the core + one example plugin work end-to-end, then public with a README that's actually ready |
| Sensitive module governance | `sensitiveData` + `requiresConsent` flags enforced by the core | Not left to individual plugin/contributor discretion |
| Contributor on-ramp | Deliberately curate a set of "good first issue" plugins | See §5 and §6 — this is how you actually get outside contributors, not an afterthought |

---

## 3. Technical architecture

### 3.1 Folder structure

```
orwell-osint/
├── core/
│   ├── plugin-loader.js       # discovers and loads modules at runtime
│   ├── plugin-interface.js    # contract/base class every plugin must implement
│   ├── pipeline.js            # orchestrator: runs modules, aggregates results
│   ├── config-manager.js      # per-module API keys/config (.env, never hardcoded)
│   └── consent-manager.js     # enforces the requiresConsent flag
├── plugins/
│   ├── username-enum/
│   │   ├── plugin.json
│   │   ├── index.js
│   │   └── README.md
│   ├── metadata-extractor/
│   ├── wigle-geolocation/
│   ├── overpass-poi/
│   ├── shodan-lookup/
│   └── ...
├── src/                        # Vue frontend
│   ├── components/
│   ├── views/
│   └── stores/                 # global state (Pinia recommended)
├── docs/
│   ├── PLUGIN_DEVELOPMENT.md   # contributor guide — see §6, treat as a first-class deliverable
│   ├── ARCHITECTURE.md
│   └── ETHICS.md                # responsible-use guidelines
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/                # CI: lint, test
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE
└── README.md
```

### 3.2 Plugin contract (plugin-interface.js)

Every plugin implements a standard interface:

```js
class OsintPlugin {
  static meta = {
    id: 'wigle-geolocation',
    name: 'WiGLE Geolocation',
    category: 'geolocation',       // identity | media | geolocation | network | social | documents
    requiresApiKey: true,
    sensitiveData: true,           // triggers consent-manager
    inputType: 'bssid',
    outputType: 'coordinates'
  };

  async validate(input) { /* input-specific validation */ }

  async run(input, config) {
    // always returns a standard shape:
    // { success, data, provenance, timestamp, confidence }
  }
}
```

**Why a standard output shape:** it lets you build a single reporting/export layer that works on any plugin, present or future, without every new module reimplementing export/logging — this is also what makes the plugin contract easy to document and easy for a new contributor to learn once.

### 3.3 Plugin manifest (plugin.json)

```json
{
  "id": "wigle-geolocation",
  "name": "WiGLE Geolocation",
  "version": "1.0.0",
  "author": "contributor-username",
  "category": "geolocation",
  "sensitiveData": true,
  "requiresConsent": true,
  "dependencies": {}
}
```

The loader reads these manifests to populate the UI dynamically, with no frontend hardcoding — a contributor adding a plugin never touches core UI code.

### 3.4 Governance enforced by the architecture

- `consent-manager.js` intercepts any call to a plugin with `requiresConsent: true` and forces an explicit, non-bypassable confirmation dialog before execution.
- Every run is logged to a local `audit-log` (who/when/what, not the data itself) for traceable investigative use.
- Configurable rate limiting per plugin, to respect third-party API ToS (WiGLE, Shodan, etc.).

---

## 4. Full feature/plugin backlog

Each entry below is later tagged in §5/§6 as either **core** (build yourself, review-heavy) or **community** (good first issue, low sensitivity, well-scoped for outside contributors).

### Identity & Username
- Multi-platform username enumeration
- Email lookup
- Breach/leak lookup (HaveIBeenPwned)
- Phone number lookup
- Cross-platform username correlation

### Images & Media
- Reverse image search
- Metadata extraction (EXIF, PDF/Office docs)
- Face detection/clustering
- Automatic screenshot/archiving (evidence preservation)

### Geolocation & Infrastructure
- WiGLE lookup (BSSID/SSID → coordinates)
- POI enrichment via Overpass API (hospitals, airports, schools, stations)
- Geocoding/reverse geocoding
- Interactive findings map
- IP geolocation

### Network & Technical Infrastructure
- WHOIS lookup
- DNS enumeration/subdomain finder
- Shodan/Censys integration
- Certificate transparency logs (crt.sh)

### Social & Content
- Social media profile aggregator
- Timeline builder
- Archive.org / Wayback Machine lookup

### Documents & Public Records
- Automated Google dorking
- Public registry lookup (e.g. Registro Imprese for Italy)
- LinkedIn/company enrichment

### Reporting & Output
- Export report (PDF/JSON/CSV)
- Relationship graph (linked entities)
- Provenance logging
- Case management (group findings by target/case)

---

## 5. Phased roadmap

Community readiness is pulled forward on purpose: a plugin-first project only attracts contributors if the contract and docs are legible from the very first public commit. Feature count is deliberately not the priority for v0.1–v0.2.

### v0.1 — Minimal core + one legible example
- [ ] `plugin-loader.js` + `plugin-interface.js` + `pipeline.js`
- [ ] `consent-manager.js` with base enforcement
- [ ] **ONE** trivial example plugin (e.g. username enumeration) — not two. A stranger should be able to read it in ~10 minutes and understand the whole contract.
- [ ] Minimal CLI to run plugins without a frontend
- [ ] First draft of `docs/PLUGIN_DEVELOPMENT.md`, written *while* building the example plugin, not after
- **Goal:** prove the architecture holds and is teachable, not cover every feature

### v0.2 — Community infrastructure (moved up from v1.0)
- [ ] README.md: what it is, declared target user, quickstart, feature list, roadmap, how to contribute, responsible-use disclaimer
- [ ] CODE_OF_CONDUCT.md (Contributor Covenant)
- [ ] CONTRIBUTING.md: coding standards, how to submit a plugin, stricter review checklist for `sensitiveData: true` modules
- [ ] Issue templates: bug report, feature request, new plugin proposal
- [ ] PR template: checklist (tests done, breaking changes, valid plugin manifest)
- [ ] Labels: `good-first-issue`, `help-wanted`, `priority`, `module:geolocation`, etc.
- [ ] GitHub Actions: lint + test on every PR (even minimal)
- [ ] Repo goes public at the end of this phase, with core + 1 plugin + real contributor docs — not empty scaffolding
- **Goal:** the repo is genuinely ready to receive an outside PR before you've built most of the features yourself

### v0.3 — Curated contributor on-ramp
- [ ] Open 4-6 well-scoped `good-first-issue` tickets from the backlog (§4) for low-sensitivity plugins: WHOIS, DNS enumeration, certificate transparency, Wayback Machine lookup
- [ ] You build 1-2 more plugins yourself as additional reference implementations (different `category` values, so contributors see variety)
- [ ] Reporting layer: standardized export (PDF/JSON/CSV) working across all existing plugins
- [ ] Persistent audit log

### v1.0 — Sensitive modules + maturity
- [ ] WiGLE geolocation + Overpass POI enrichment — built and reviewed by you directly, given `sensitiveData: true`
- [ ] Case management
- [ ] Revisit CONTRIBUTING.md and ETHICS.md based on actual contributor questions/PRs received so far
- [ ] Evaluate whether a small maintainer team makes sense yet, or single-maintainer is still right

---

## 6. Community setup — details

Treat this as core deliverable work in v0.2, not polish added at the end.

- **README.md** is the single highest-leverage file for attracting contributors — it should sell the *project*, not just list features. Lead with the plugin architecture and the "add a module in an afternoon" pitch.
- **PLUGIN_DEVELOPMENT.md** matters as much as the code itself. Write it by literally documenting your own steps while building the v0.1 example plugin — don't write it retroactively from memory.
- **Good-first-issue curation (v0.3):** deliberately hold back easy, well-bounded plugins (WHOIS, DNS enum, cert transparency, Wayback lookup) instead of building them yourself. This is the actual mechanism by which people become contributors — a vague backlog doesn't do it, a scoped ticket with acceptance criteria does.
- **Sensitive modules stay yours:** WiGLE, breach lookup, and anything else with `sensitiveData: true` should be built and merged only with your direct review, regardless of how the rest of the contribution pipeline is delegated.

---

## 7. Immediate next steps

1. Decide license (MIT/Apache-2.0 vs AGPL-3.0)
2. Create the GitHub repo (private initially)
3. Move to Claude Code for execution: start with `core/` (plugin-loader, interface, pipeline) + 1 example plugin, writing `PLUGIN_DEVELOPMENT.md` alongside it
4. Once v0.1 works end-to-end, build out v0.2 community infrastructure *before* adding more plugins or frontend work
5. Only after the repo is public and legible, proceed with the curated good-first-issue batch and additional modules
