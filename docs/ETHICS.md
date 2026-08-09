# Responsible Use & Ethics

Orwell OSINT aggregates and correlates information that is already
public: public APIs, public records, public social profiles, and public
infrastructure databases (like WiGLE's WiFi network data). It is built
for people doing authorized, legitimate investigative work — not for
surveilling private individuals.

This document is for both **users** (what this tool is and isn't for) and
**contributors** (what a plugin is and isn't allowed to do). It's a real
constraint on the project, not a disclaimer to avoid — the architecture
enforces parts of it directly (see [Enforcement](#enforcement-in-the-architecture)
below), and PRs are reviewed against it (see
[CONTRIBUTING.md](../CONTRIBUTING.md)).

## Who this is for

- Authorized penetration testers and red teams, operating within the
  scope of an engagement
- DFIR practitioners and security researchers
- Journalists doing public-interest investigative work
- Cybersecurity students learning OSINT methodology

## What this project will not do

Orwell OSINT does not exploit systems, bypass authentication, or access
private data. Plugins pull only from a data source's declared, public,
legitimate API or dataset — not by scraping around an auth wall or rate
limit to get data the source wouldn't otherwise return.

More specifically, out of scope for this project, regardless of what's
technically possible with the same public APIs:

- Automating harassment, stalking, or unauthorized surveillance of a
  specific person
- Automated cross-referencing designed to deanonymize or track a specific
  individual without their knowledge, even when every individual data
  point involved is itself public
- Bypassing authentication, exploiting systems, or accessing data that
  isn't public

If a proposed feature would primarily be useful for one of the above
rather than for authorized security research, it's out of scope — raise
it as a discussion, not a PR, so it can be redirected before any code is
written.

## Using this responsibly

- Only run plugins against targets you're authorized to investigate —
  under an engagement's scope, your own infrastructure, or clearly public
  research subjects.
- Treat every finding as a lead, not a conclusion. Two accounts sharing a
  username is a correlation to verify, not proof of identity.
- Respect the terms of service of every third-party API and data source
  a plugin queries. Rate limiting exists in the architecture to help with
  this, not to work around it.
- Preserve evidence and provenance appropriately for your context (legal,
  journalistic, or engagement-specific chain-of-custody requirements are
  yours to satisfy — this tool records provenance per result, but doesn't
  make that determination for you).

## Enforcement in the architecture

Some of this is enforced in code, not just in this document:

- Every plugin declares `sensitiveData` and `requiresConsent` in its
  manifest (`plugin.json`). `core/consent-manager.js` is wired into the
  execution pipeline (`core/pipeline.js`) and blocks any plugin with
  `requiresConsent: true` until an explicit, affirmative confirmation is
  given — by default an interactive CLI prompt, defaulting to **deny**
  when unanswered. There is no configuration flag that bypasses this.
- Plugins with `sensitiveData: true` (geolocation, breach/leak lookup, and
  similar) are reviewed and merged directly by the maintainer, held to
  the stricter checklist in [CONTRIBUTING.md](../CONTRIBUTING.md), rather
  than delegated to general contributor review.
- Planned for v0.3+ (not yet built): a persistent local audit log
  recording who ran what plugin against what input and when — not the
  resulting data itself — so use is traceable rather than silent, and
  per-plugin rate limiting to keep third-party API usage within each
  service's terms of service.

## If you're not sure

If you're a contributor and unsure whether a plugin idea fits within this
policy, open a discussion before writing code. If you're a user unsure
whether a specific use case is appropriate, the questions above (Are you
authorized? Is the target a specific private individual? Are you
respecting the source API's terms?) are the ones to answer honestly
first.
