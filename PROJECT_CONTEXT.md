# Project Context & Scope (read before working on sensitive modules)

Orwell OSINT is a defensive/research-oriented OSINT tool built for:
- authorized penetration testers and red teams
- DFIR practitioners and security researchers
- journalists doing public-interest investigative work
- cybersecurity students learning OSINT methodology

It aggregates and correlates information that is already public (public APIs,
public records, public social profiles, public WiFi network databases like
WiGLE). It does not exploit systems, bypass authentication, access private
data, or automate harassment/stalking.

## Built-in safeguards (not just policy — enforced in code)

- Every plugin declares `sensitiveData` and `requiresConsent` in its
  manifest. The `consent-manager.js` in `core/` enforces an explicit,
  non-bypassable confirmation step before any such plugin runs — this is
  architectural, not a comment or a README promise.
- All plugin runs are written to a local audit log (who/when/what was
  queried), so use is traceable rather than silent.
- Rate limiting is enforced per plugin to respect third-party API ToS
  (WiGLE, Shodan, etc.) rather than scraping around them.
- The README (v0.2+) states the intended use case and target users
  explicitly, and `docs/ETHICS.md` documents expected responsible use for
  contributors.

## Guidance for implementation work (including AI-assisted coding)

When building a module that touches location, personal identifiers, or
aggregated personal data (e.g. the WiGLE/Overpass geolocation module),
implement it the same way a defensive security product would:
- pull from the declared public/legitimate API only (no scraping around
  rate limits or auth walls)
- wire it through `consent-manager.js` like every other sensitive plugin
- do not add capabilities beyond what's scoped in `ORWELL_OSINT_PLAN.md`
  (e.g. no automated cross-referencing designed to deanonymize or track a
  specific individual without their knowledge — that's out of scope for
  this project regardless of what's technically possible with the same
  APIs)

If a requested feature would primarily be useful for stalking, harassment,
or unauthorized surveillance of a specific person rather than authorized
security research, it's out of scope for Orwell OSINT — flag it rather
than building it.
