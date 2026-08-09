# HTTP Security Headers Check

Fetches a URL and reports which common security-related response headers
it sends: `Strict-Transport-Security`, `Content-Security-Policy`,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`.

- **Category:** network
- **Sensitive data:** no — this reports headers the server sends to any
  ordinary visitor; nothing private or target-specific.
- **Requires consent:** no
- **Requires API key:** no

## Input

A URL or bare domain (e.g. `example.com` or `https://example.com`) — bare
domains are normalized to `https://`.

## Output shape

```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "statusCode": 200,
    "headers": {
      "strict-transport-security": "max-age=63072000",
      "content-security-policy": null,
      "x-content-type-options": "nosniff",
      "x-frame-options": null,
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": null
    }
  },
  "provenance": {
    "plugin": "http-security-headers",
    "pluginVersion": "1.0.0",
    "sources": ["https://example.com"]
  },
  "timestamp": "2026-08-09T12:00:00.000Z",
  "confidence": 0.5
}
```

`confidence` here means "fraction of the checked headers that were
present," not correctness or certainty of the result — a coverage score,
not a confidence-in-data-quality score. Documented explicitly because it
means something different from username-enum's `confidence` (fraction of
sites matched), which is the point: the field's meaning is plugin-defined,
so read each plugin's README rather than assuming a shared scale.

## Known limitations

- Only checks the final response after redirects (`redirect: 'follow'`);
  it doesn't report on headers sent by intermediate redirect hops.
- A missing header here means the header wasn't present on this response,
  not that the site is insecure — some headers are irrelevant for some
  content types or architectures. Treat this as a lead for manual review.
- Times out after 5 seconds by default (`config.timeoutMs` to override).

## Run it

```sh
node cli.js http-security-headers example.com
```
