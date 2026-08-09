# [Plugin] Certificate Transparency Lookup (crt.sh)

**Labels:** `good-first-issue`, `help-wanted`, `module:network`

## What this plugin should do

Add `plugins/crt-sh-lookup/`: given a domain, query
[crt.sh](https://crt.sh)'s public JSON API for certificates issued for
that domain (and its subdomains), which is a common way to discover
subdomains that have ever had a TLS certificate issued.

- **Input:** a domain name string (e.g. `example.com`)
- **Output (`data`):** something like:
  ```json
  {
    "domain": "example.com",
    "certificates": [
      {
        "commonName": "www.example.com",
        "issuerName": "...",
        "notBefore": "2026-01-01T00:00:00",
        "notAfter": "2027-01-01T00:00:00"
      }
    ],
    "uniqueSubdomains": ["www.example.com", "mail.example.com"]
  }
  ```

## Implementation notes

- Query `https://crt.sh/?q=<domain>&output=json` with a plain `fetch` —
  same pattern as `username-enum`'s site checks, just one source instead
  of several.
- crt.sh can return a **lot** of rows for popular domains (thousands of
  certs) and is a shared public service that's been rate-limited or slow
  before — set a reasonable timeout, and cap how many rows you process if
  the response is huge (document the cap and how it's chosen).
- `uniqueSubdomains` is worth deriving separately from raw `commonName`
  values — crt.sh entries often repeat the same name across reissued
  certs, so dedupe rather than reporting every raw row as if it were a
  new subdomain.
- Category: `network`. `sensitiveData: false`, `requiresConsent: false` —
  certificate transparency logs are a public, append-only record by
  design.

## Acceptance criteria

See [docs/PLUGIN_DEVELOPMENT.md](../PLUGIN_DEVELOPMENT.md) and
[plugins/username-enum/](../../plugins/username-enum/) as the reference
implementation.

- [ ] `plugins/crt-sh-lookup/plugin.json`, `index.js`, `README.md`
- [ ] `validate()` rejects non-domain-shaped input before any network call
- [ ] `run()` always resolves the standard shape; crt.sh being slow,
      rate-limited, or returning zero results is a normal outcome, not a
      thrown exception
- [ ] `config.fetchImpl` (or equivalent) is injectable so tests don't
      depend on crt.sh being reachable
- [ ] README documents the row cap (if any) and where `uniqueSubdomains`
      dedup logic lives
- [ ] Tests pass via `npm test` without network access
