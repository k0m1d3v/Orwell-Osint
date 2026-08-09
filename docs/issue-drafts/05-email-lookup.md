# [Plugin] Email Lookup (format, deliverability, and Gravatar existence only)

**Labels:** `good-first-issue`, `help-wanted`, `module:identity`

## What this plugin should do

Add `plugins/email-lookup/`: given an email address, report syntax
validity, whether its domain has mail-capable DNS records, and whether a
Gravatar profile exists for it — nothing more.

- **Input:** an email address string
- **Output (`data`):** something like:
  ```json
  {
    "email": "person@example.com",
    "validSyntax": true,
    "domainHasMxRecord": true,
    "gravatar": { "exists": true, "profileUrl": "https://gravatar.com/person-hash" }
  }
  ```

## Scope — read before starting

This is deliberately **not** a breach/leak lookup or an account-existence
scanner across third-party sites. Those are separate, higher-sensitivity
backlog items (see [ORWELL_OSINT_PLAN.md](../../ORWELL_OSINT_PLAN.md) §4)
that would need `sensitiveData: true` and the stricter review path in
[CONTRIBUTING.md](../../CONTRIBUTING.md). Keep this plugin to the three
checks above:

1. **Syntax validation** — a reasonable regex or `URL`-style parse, no
   network call.
2. **MX record existence** — does the domain have mail-capable DNS
   records at all (`node:dns/promises resolveMx`)? This says nothing
   about whether the specific mailbox exists, only that mail could be
   routed to that domain.
3. **Gravatar existence** — Gravatar's API lets you check whether a
   profile exists for the MD5/SHA256 hash of an email, without needing an
   API key, and only confirms something the email's owner chose to make
   public by creating a Gravatar profile.

Do not add SMTP-level mailbox verification (connecting to the mail server
and probing whether a specific mailbox accepts mail) — that technique is
commonly associated with spam list validation and is a meaningfully
different sensitivity/abuse profile than the three checks above. If
that's wanted later, propose it separately with its own sensitivity
assessment.

## Implementation notes

- Category: `identity`. `sensitiveData: false`, `requiresConsent: false`
  — scoped as above, this only touches DNS and a service the email owner
  opted into.
- Gravatar hashing: lowercase + trim the email, then hash (Gravatar's
  current API accepts SHA256; check their docs for the current
  requirement rather than assuming MD5, which is legacy).

## Acceptance criteria

See [docs/PLUGIN_DEVELOPMENT.md](../PLUGIN_DEVELOPMENT.md) and
[plugins/username-enum/](../../plugins/username-enum/) as the reference
implementation.

- [ ] `plugins/email-lookup/plugin.json`, `index.js`, `README.md`
- [ ] `validate()` rejects malformed email input before any network/DNS
      call
- [ ] `run()` always resolves the standard shape; no MX record or no
      Gravatar profile are normal `success: true` outcomes, not failures
- [ ] DNS resolution and the Gravatar HTTP call are both injectable for
      tests (mirror `username-enum`'s `config.fetchImpl` pattern)
- [ ] README explicitly states what this plugin does **not** do (breach
      lookup, SMTP verification, cross-site account enumeration) and
      links to this scope note
- [ ] Tests pass via `npm test` without network access
