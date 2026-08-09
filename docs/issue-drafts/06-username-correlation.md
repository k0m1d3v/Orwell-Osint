# [Plugin] Cross-Platform Username Correlation

**Labels:** `good-first-issue`, `help-wanted`, `module:identity`

## What this plugin should do

Add `plugins/username-correlation/`: check a username against a **larger**
set of platforms than `username-enum` covers, and where a platform's
public API exposes lightweight profile signals (display name, account
creation date, bio/description), surface those alongside each match to
help a human judge whether matches likely belong to the same person.

This plugin does not itself decide "these are the same person" — it
surfaces signals for a human reviewer, the same way `username-enum`
surfaces existence rather than identity claims.

- **Input:** a username string (same validation rules as `username-enum`)
- **Output (`data`):** something like:
  ```json
  {
    "username": "octocat",
    "matches": [
      {
        "site": "GitHub",
        "found": true,
        "profile": { "displayName": "The Octocat", "createdAt": "2011-01-25T18:44:36Z", "bio": null }
      }
    ],
    "checked": [ /* one entry per site, found or not */ ]
  }
  ```

## Implementation notes

- Start from `plugins/username-enum/index.js` as a base pattern — same
  per-site `checkSite`-style structure — but expand the site list (aim
  for roughly double `username-enum`'s four) and add a `profile` field
  per match where the platform's API returns one without extra
  authentication.
- Only pull profile fields that are already public via the platform's own
  API response (e.g. GitHub's `/users/{username}` returns `name`,
  `created_at`, `bio` in the same call you're already making to check
  existence) — don't add a second authenticated call to get more.
- Resist scope creep into actual correlation logic (fuzzy name matching,
  scoring "same person" confidence across sites) — that's a bigger,
  separate proposal. This plugin's job is to gather the signals in one
  place, not to draw the conclusion.
- Category: `identity`. `sensitiveData: false`, `requiresConsent: false`
  — same reasoning as `username-enum`: existence + already-public profile
  fields the account holder chose to publish, not anything private.

## Acceptance criteria

See [docs/PLUGIN_DEVELOPMENT.md](../PLUGIN_DEVELOPMENT.md) and
[plugins/username-enum/](../../plugins/username-enum/) as the reference
implementation — this ticket is explicitly "extend that pattern," so
deviating from it should have a reason.

- [ ] `plugins/username-correlation/plugin.json`, `index.js`, `README.md`
- [ ] `validate()` matches `username-enum`'s rules (or documents why it
      diverges)
- [ ] `run()` always resolves the standard shape; a per-site failure
      (timeout, rate limit) degrades that one entry, not the whole run
- [ ] `config.fetchImpl` is injectable so tests don't depend on real
      network access
- [ ] README lists every site checked, which ones return profile fields
      vs. existence-only, and states plainly that this plugin does not
      compute identity-correlation confidence
- [ ] Tests pass via `npm test` without network access
