# Username Enumeration

Checks whether a given username exists on a small set of public platforms
(GitHub, GitLab, Reddit, Dev.to), by hitting each platform's public API/JSON
endpoint and reading whether it resolves to an account or not.

- **Category:** identity
- **Sensitive data:** no — this only checks public existence of a
  username, it does not fetch or return any profile content, personal
  data, or private information.
- **Requires consent:** no
- **Requires API key:** no

## Input

A single username string: letters, numbers, `_` and `-`, must start with a
letter or number, max 39 characters (GitHub's own limit, used here as a
reasonable common denominator).

## Output shape

```json
{
  "success": true,
  "data": {
    "username": "octocat",
    "matches": [
      { "site": "GitHub", "found": true, "statusCode": 200 }
    ],
    "checked": [
      { "site": "GitHub", "found": true, "statusCode": 200 },
      { "site": "GitLab", "found": false, "statusCode": 200 },
      { "site": "Reddit", "found": false, "statusCode": 404 },
      { "site": "Dev.to", "found": false, "statusCode": 404 }
    ],
    "customSiteErrors": []
  },
  "provenance": {
    "plugin": "username-enum",
    "pluginVersion": "1.1.0",
    "sources": ["GitHub", "GitLab", "Reddit", "Dev.to"]
  },
  "timestamp": "2026-08-09T12:00:00.000Z",
  "confidence": 0.25
}
```

`confidence` is the fraction of checked sites that returned a match — a
simple placeholder heuristic, not a claim about identity correlation across
sites.

## Anti-false-positive verification

Some sites return HTTP 200 (or, for the array-shaped GitLab-style check, a
non-empty array) for *any* input — a parked page, a generic profile shell,
a catch-all redirect — which would otherwise read as a match. Passing
`--anti-false-positive` makes the plugin read the response body and
confirm the username actually appears in it before trusting the status
code:

```sh
node cli.js username-enum octocat --anti-false-positive
```

A site demoted this way comes back in `checked` with `found: false` and
`falsePositiveSuspected: true` instead of a bare `found: true`. This is
off by default — it's a heuristic (substring match on the serialized
body), not a guarantee, and costs an extra body read per site.

## Custom sites

Check an extra site for a single run with `--site "Name=URLTemplate"`,
where the template contains a literal `{username}` placeholder. Repeat
the flag to add more than one:

```sh
node cli.js username-enum octocat --site "Keybase=https://keybase.io/_/api/1.0/user/lookup.json?username={username}"
```

A malformed value (no `=`, or no `{username}` in the template) is
reported in `data.customSiteErrors` rather than failing the run. Custom
sites are checked the same way as the built-in ones — including
`--anti-false-positive`, if passed — but only for that invocation; they
aren't persisted anywhere.

## Known limitations

- Some platforms rate-limit or bot-block unauthenticated requests
  (particularly Reddit); repeated runs in a short window may see more
  `found: false` results than are actually true, or timeouts. This is
  reported per-site (`error: "timeout"` or a non-200 status) rather than
  failing the whole run.
- A username existing on a platform is not proof the accounts belong to the
  same person — this plugin surfaces leads, not conclusions.

## Run it

```sh
node cli.js username-enum octocat
```
