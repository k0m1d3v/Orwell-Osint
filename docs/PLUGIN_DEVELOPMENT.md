# Plugin Development Guide

This walks through how `plugins/username-enum` was actually built, in the
order it was built, so you can follow the same path for a new plugin. If
you only read one doc before contributing a plugin, read this one — it's
written from the build, not from a template.

If you haven't yet, skim `core/plugin-interface.js` first. It's short on
purpose; everything below is just "how to satisfy that contract."

## 1. Pick a folder name and stub the manifest

The plugin's folder name *is* its id — the loader checks this
(`core/plugin-loader.js`, `readManifest`) and refuses to load a plugin
whose `plugin.json` `id` doesn't match its folder name. Get this right
first so nothing downstream has to be revisited.

```
plugins/username-enum/
├── plugin.json
├── index.js
└── README.md
```

`plugin.json`:

```json
{
  "id": "username-enum",
  "name": "Username Enumeration",
  "version": "1.0.0",
  "author": "orwell-osint-core",
  "category": "identity",
  "sensitiveData": false,
  "requiresConsent": false,
  "dependencies": {}
}
```

Required fields, enforced by the loader at load time (not silently
defaulted, except `dependencies` which defaults to `{}`):
`id`, `name`, `version`, `author`, `category`, `sensitiveData`,
`requiresConsent`. Getting `sensitiveData`/`requiresConsent` right here
matters more than any other field — it's what the consent-manager gates
on (§4 below), and it's read from this file, not from your code, so the
loader can know a plugin's governance flags without ever executing it.

**Deciding `sensitiveData`/`requiresConsent` for username-enum:** the
plugin only reports whether a username *exists* on a public platform. It
returns no profile content, no personal data, nothing that isn't already
either public or a boolean. That made `false`/`false` the right call —
contrast with something like a breach-lookup or geolocation plugin, which
would be `true`/`true`.

## 2. Write `index.js` against the interface

Every plugin extends `OsintPlugin` from `core/plugin-interface.js` and
implements two async methods:

```js
import { OsintPlugin } from '../../core/plugin-interface.js';

export default class UsernameEnumPlugin extends OsintPlugin {
  static meta = {
    id: 'username-enum',
    name: 'Username Enumeration',
    category: 'identity',
    requiresApiKey: false,
    inputType: 'username',
    outputType: 'platform-matches',
  };

  async validate(input) { /* ... */ }
  async run(input, config = {}) { /* ... */ }
}
```

Note `static meta` here duplicates some of `plugin.json` (id, name,
category) but adds implementation details the manifest doesn't carry
(`inputType`, `outputType`, `requiresApiKey`). It deliberately does **not**
repeat `sensitiveData`/`requiresConsent` — those live in exactly one
place (the manifest) so there's never a question of which one is
authoritative if they disagreed.

### `validate(input)`

Cheap, synchronous-feeling, no network calls. Returns
`{ valid: true }` or `{ valid: false, reason: string }`. For
username-enum this is just a regex check:

```js
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$/;

async validate(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return { valid: false, reason: 'Input must be a non-empty string' };
  }
  if (!USERNAME_PATTERN.test(input)) {
    return { valid: false, reason: 'Username must start with a letter/number and contain only letters, numbers, "_" or "-"' };
  }
  return { valid: true };
}
```

The pipeline (`core/pipeline.js`) calls this *before* the consent check
and *before* `run()` — there's no point prompting for consent, let alone
making network calls, on input that's already known to be bad. On
failure, the pipeline synthesizes a standard failure result on your
behalf (`{ success: false, data: null, provenance: { stage: 'validate' }, error: <reason> }`);
your plugin never has to construct that shape itself.

### `run(input, config)`

Must **always** resolve to the standard shape — never throw for expected
failure modes (rate limited, target not found). Throwing is reserved for
actual bugs/infra failures. `core/plugin-interface.js`'s
`assertValidResult` enforces this shape after every `run()` call, so a
plugin that returns something malformed fails loudly in tests/CLI rather
than silently corrupting downstream reporting:

```js
async run(input, config = {}) {
  const fetchImpl = config.fetchImpl || globalThis.fetch;
  const checked = await Promise.all(SITES.map((site) => checkSite(site, input, fetchImpl, timeoutMs)));
  const matches = checked.filter((r) => r.found);

  return {
    success: true,
    data: { username: input, matches, checked },
    provenance: { plugin: UsernameEnumPlugin.meta.id, pluginVersion: '1.0.0', sources: SITES.map((s) => s.name) },
    timestamp: new Date().toISOString(),
    confidence: checked.length === 0 ? 0 : matches.length / checked.length,
  };
}
```

**Design choice worth flagging:** `config.fetchImpl` defaults to the
global `fetch`, but can be overridden. This has nothing to do with the
plugin's runtime behavior — it exists purely so tests can inject a fake
fetch and never make a real network call (see §5). If your plugin makes
outbound calls of any kind, give yourself the same seam.

## 3. Decide what "found" means for your data source, per-source

The four sites checked don't all signal "does this account exist?" the
same way:

- GitHub, Reddit, Dev.to: a plain JSON endpoint that 404s if the user
  doesn't exist, 200s if they do.
- GitLab: its search endpoint always 200s, and returns an **empty array**
  when nobody matches.

`checkSite()` branches on a per-site `emptyArrayMeansNotFound` flag rather
than assuming every source behaves like the majority. When you add a
platform, check what its real "not found" response looks like instead of
assuming 404 — it's a common source of silent false negatives.

Also budget for timeouts and bot-blocking: each check gets an
`AbortController` with a timeout (default 5s, overridable via
`config.timeoutMs`), and a failed/timed-out check becomes
`{ found: false, error: ... }` for that one site rather than failing the
whole run. In practice, Reddit's endpoint 403s unauthenticated requests
fairly often — that's expected and documented in the plugin's own
README, not treated as a bug.

## 4. Consent — even though this plugin doesn't need it

`requiresConsent: false` here means `core/consent-manager.js` is a no-op
for this plugin (`ConsentManager.authorize()` returns `true` immediately
when the manifest says consent isn't required). But the hook is still
*in* the pipeline, unconditionally, for every plugin — nothing about the
plugin contract lets you opt out of that check being present, only its
outcome. When a future `sensitiveData: true` plugin sets
`requiresConsent: true`, the same pipeline call
(`await this.consentManager.authorize(manifest, input)` in
`core/pipeline.js`) will block execution until an explicit "yes" (default
CLI prompt) or an injected `promptFn` returns `true`. See
`test/pipeline.test.js` for a minimal fixture plugin that proves this
gate actually blocks/allows execution — worth reading even for a
non-sensitive plugin, so you know what your plugin would be opted into
if you ever flip `requiresConsent` to `true` later.

## 5. Test without hitting the network

`test/pipeline.test.js` exercises the real `username-enum` plugin through
the real `Pipeline`, but with a fake `fetchImpl` passed in via `config`:

```js
function fakeFetch(url) {
  const found = url.includes('octocat');
  return Promise.resolve({
    status: found ? 200 : 404,
    json: async () => (found ? [{ username: 'octocat' }] : []),
  });
}

const result = await pipeline.runPlugin(loadedPlugin, 'octocat', { fetchImpl: fakeFetch });
```

Run the suite with:

```sh
npm test
```

`test/plugin-loader.test.js` covers the loader contract (manifest
required fields, id/folder-name match) using a broken fixture manifest
under `test/fixtures/`, separate from any real plugin — don't put
intentionally-broken fixtures under `plugins/`, the loader/CLI treat
everything there as real.

## 6. Run it manually

No registration step — dropping the folder into `plugins/` is enough,
because the loader discovers plugins by scanning `plugins/` at call time
rather than reading from a central list:

```sh
node cli.js username-enum octocat
```

## Checklist for a new plugin

- [ ] Folder name matches `plugin.json`'s `id`
- [ ] `plugin.json` has all required fields; `sensitiveData`/
      `requiresConsent` reflect what the plugin actually returns, not
      just what feels cautious or convenient
- [ ] `index.js` default-exports a class extending `OsintPlugin`
- [ ] `validate()` does no I/O and returns `{ valid }`/`{ valid: false, reason }`
- [ ] `run()` always resolves the standard shape (`success`, `data`,
      `provenance`, `timestamp`, `confidence`) — never throws for
      expected failures
- [ ] Any outbound call has an injectable seam (like `config.fetchImpl`)
      so tests don't hit real services
- [ ] Tests pass with `npm test`, without needing network access
- [ ] `README.md` in the plugin folder documents input, output shape,
      and known limitations (rate limits, bot-blocking, accuracy caveats)
