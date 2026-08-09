# Good-first-issue drafts (v0.3)

Drafted per the plan's v0.3 phase (§5): curated, well-scoped plugin
tickets held back deliberately rather than built by the maintainer, so
they can become a real contributor on-ramp. **Not yet opened as live
GitHub issues** — pending maintainer review of this batch first.

Each file below is a ready-to-paste GitHub issue: title as the top `#`
heading, then body. All six are `sensitiveData: false` by design (see
[../ETHICS.md](../ETHICS.md)) — none require the stricter sensitive-module
review path in [CONTRIBUTING.md](../../CONTRIBUTING.md).

| Draft | Category | Data source |
|---|---|---|
| [01-whois-lookup.md](01-whois-lookup.md) | network | WHOIS protocol |
| [02-dns-enumeration.md](02-dns-enumeration.md) | network | DNS (`node:dns`) |
| [03-certificate-transparency.md](03-certificate-transparency.md) | network | crt.sh public API |
| [04-wayback-machine-lookup.md](04-wayback-machine-lookup.md) | social | archive.org public API |
| [05-email-lookup.md](05-email-lookup.md) | identity | DNS MX + Gravatar (no breach data) |
| [06-username-correlation.md](06-username-correlation.md) | identity | multiple public platform APIs |

Once approved, open each with `gh issue create --title "..." --body-file
docs/issue-drafts/NN-....md --label good-first-issue,help-wanted,module:<category>`
(strip the `#` title line from the body first, since `gh` takes the title
separately) — or paste directly into GitHub's "New issue" form.
