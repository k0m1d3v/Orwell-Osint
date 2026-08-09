# [Plugin] DNS Enumeration / Subdomain Finder

**Labels:** `good-first-issue`, `help-wanted`, `module:network`

## What this plugin should do

Add `plugins/dns-enum/`: given a domain, resolve its common DNS record
types, and check a small, fixed list of common subdomain labels for
resolution.

- **Input:** a domain name string (e.g. `example.com`)
- **Output (`data`):** something like:
  ```json
  {
    "domain": "example.com",
    "records": {
      "A": ["93.184.216.34"],
      "AAAA": [],
      "MX": [{ "priority": 10, "exchange": "mail.example.com" }],
      "TXT": ["v=spf1 -all"],
      "NS": ["a.iana-servers.net", "b.iana-servers.net"]
    },
    "subdomains": [
      { "label": "www", "resolved": true, "addresses": ["93.184.216.34"] },
      { "label": "mail", "resolved": false }
    ]
  }
  ```

## Implementation notes

- Use `node:dns/promises` (`resolve4`, `resolve6`, `resolveMx`,
  `resolveTxt`, `resolveNs`) — no external dependency needed, and no HTTP
  calls at all for this plugin.
- Keep the subdomain wordlist small and fixed (e.g. `www`, `mail`, `ftp`,
  `api`, `dev`, `staging`, `admin`, `blog`, `shop`, `test` — ten is
  plenty). This is a DNS resolver doing lookups, not a brute-force
  scanner — see [docs/ETHICS.md](../ETHICS.md): keep query volume modest
  and don't turn this into an aggressive enumeration tool by growing the
  list unboundedly. If you want a bigger wordlist later, that's a
  separate proposal with its own rate-limiting discussion.
- `resolve*` calls reject with an error (e.g. `ENOTFOUND`) when a record
  type doesn't exist for a domain — that's an expected, normal outcome
  per record type, not a plugin failure. Catch per-lookup and record an
  empty result for that type, don't let one missing record type fail the
  whole `run()`.
- Category: `network`. `sensitiveData: false`, `requiresConsent: false`.

## Acceptance criteria

See [docs/PLUGIN_DEVELOPMENT.md](../PLUGIN_DEVELOPMENT.md) and
[plugins/username-enum/](../../plugins/username-enum/) as the reference
implementation.

- [ ] `plugins/dns-enum/plugin.json`, `index.js`, `README.md`
- [ ] `validate()` rejects non-domain-shaped input before any DNS lookup
- [ ] `run()` always resolves the standard shape; a missing record type
      or an unresolvable subdomain is reflected in the output, not a
      thrown exception or a failed `run()`
- [ ] The DNS resolver functions are injectable (mirror `username-enum`'s
      `config.fetchImpl` pattern — here it'd be something like
      `config.resolveImpl`) so tests don't require real DNS resolution
- [ ] README documents the exact subdomain wordlist used and why it's
      kept small
- [ ] Tests pass via `npm test` without network access
