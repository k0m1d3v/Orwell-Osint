# [Plugin] WHOIS Lookup

**Labels:** `good-first-issue`, `help-wanted`, `module:network`

## What this plugin should do

Add `plugins/whois-lookup/`: given a domain name, query WHOIS and return
registration data (registrar, creation/expiry dates, name servers,
registrant organization where public).

- **Input:** a domain name string (e.g. `example.com`)
- **Output (`data`):** something like:
  ```json
  {
    "domain": "example.com",
    "registrar": "...",
    "creationDate": "...",
    "expiryDate": "...",
    "nameServers": ["...", "..."],
    "raw": "the full raw WHOIS response text"
  }
  ```
  Keep `raw` in the output — WHOIS response formats vary a lot by
  registry, and a raw fallback is more useful than a parser that silently
  drops fields it doesn't recognize.

## Implementation notes

- WHOIS is a plaintext TCP protocol on port 43, not HTTP — use Node's
  built-in `node:net` to open a socket, no HTTP client involved.
- Different TLDs have different authoritative WHOIS servers. A
  reasonable v1 scope: query IANA's WHOIS (`whois.iana.org`) first to get
  the referral to the TLD's authoritative server, then query that server.
  Document which TLDs you've actually tested against in the plugin's
  README — don't claim universal coverage you haven't verified.
- Some registries (notably `.com`/`.net` via Verisign) thin-WHOIS and
  return limited data with a pointer to the registrar's own WHOIS server
  for full detail — a second-hop lookup is a nice-to-have, not required
  for v1. Document the gap instead of leaving it silent.
- Category: `network`. `sensitiveData: false`, `requiresConsent: false`
  — WHOIS data is, by design, a public registry lookup.

## Acceptance criteria

Mirrors how `username-enum` is built — see
[docs/PLUGIN_DEVELOPMENT.md](../PLUGIN_DEVELOPMENT.md) for the full
walkthrough and [plugins/username-enum/](../../plugins/username-enum/) as
the reference implementation.

- [ ] `plugins/whois-lookup/plugin.json`, `index.js`, `README.md`
- [ ] `validate()` rejects non-domain-shaped input without any network
      call
- [ ] `run()` always resolves the standard shape (`success`, `data`,
      `provenance`, `timestamp`, `confidence`); a WHOIS server timeout or
      "no such domain" response is a `{ success: false, error }` result,
      not a thrown exception
- [ ] The TCP socket has a timeout (WHOIS servers can hang) and the
      socket connection is injectable/mockable so tests don't require a
      real network call
- [ ] Tests pass via `npm test` without network access
- [ ] README documents which TLDs were tested and the thin-WHOIS
      limitation above
