import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pipeline } from '../core/pipeline.js';
import { AuditLog } from '../core/audit-log.js';
import { loadPlugin } from '../core/plugin-loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
const NOOP_AUDIT_LOG = new AuditLog({ enabled: false });

async function run(input, config) {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'username-enum');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });
  return pipeline.runPlugin(loadedPlugin, input, config);
}

// A real fetch() Response always has both .json() and .text() (.text()
// backs .json() internally) — a mock that only implements .json() isn't
// representative and previously hid a bug where the anti-false-positive
// path's body read failed silently against any real, non-JSON response.
function jsonResponse(status, body) {
  return { status, json: async () => body, text: async () => JSON.stringify(body) };
}

// One handler per built-in site, so anti-false-positive tests can make a
// single site lie (200 with a body that doesn't mention the username)
// without the other three sites' responses drifting out of shape.
function fetchFor(handlers) {
  return async (url) => {
    for (const [match, handler] of Object.entries(handlers)) {
      if (url.includes(match)) return handler();
    }
    return jsonResponse(404, {});
  };
}

test('reports matches across built-in sites, GitLab array shape included', async () => {
  const result = await run('octocat', {
    fetchImpl: fetchFor({
      'api.github.com': () => jsonResponse(200, { login: 'octocat' }),
      'gitlab.com': () => jsonResponse(200, [{ username: 'octocat' }]),
      'reddit.com': () => jsonResponse(404, {}),
      'dev.to': () => jsonResponse(404, {}),
    }),
  });

  assert.equal(result.success, true);
  assert.deepEqual(
    result.data.matches.map((m) => m.site),
    ['GitHub', 'GitLab'],
  );
  assert.equal(result.data.customSiteErrors.length, 0);
});

test('anti-false-positive: a 200 whose body never mentions the username is demoted, not trusted', async () => {
  // A "parked profile" page: 200 OK, valid JSON, but generic — no trace
  // of the username anywhere in it.
  const result = await run('octocat', {
    antiFalsePositive: true,
    fetchImpl: fetchFor({
      'api.github.com': () => jsonResponse(200, { message: 'this page intentionally blank' }),
      'gitlab.com': () => jsonResponse(200, [{ username: 'octocat' }]),
      'reddit.com': () => jsonResponse(404, {}),
      'dev.to': () => jsonResponse(404, {}),
    }),
  });

  const github = result.data.checked.find((c) => c.site === 'GitHub');
  assert.equal(github.found, false);
  assert.equal(github.falsePositiveSuspected, true);

  const gitlab = result.data.checked.find((c) => c.site === 'GitLab');
  assert.equal(gitlab.found, true);
  assert.equal(gitlab.verified, true);

  assert.deepEqual(
    result.data.matches.map((m) => m.site),
    ['GitLab'],
  );
});

test('anti-false-positive is opt-in: without the flag, the same body-less 200 still counts as found', async () => {
  const result = await run('octocat', {
    fetchImpl: fetchFor({
      'api.github.com': () => jsonResponse(200, { message: 'nothing to see here' }),
      'gitlab.com': () => jsonResponse(404, []),
      'reddit.com': () => jsonResponse(404, {}),
      'dev.to': () => jsonResponse(404, {}),
    }),
  });

  const github = result.data.checked.find((c) => c.site === 'GitHub');
  assert.equal(github.found, true);
  assert.equal('falsePositiveSuspected' in github, false);
});

// Regression test for a real bug: response.json() reads-then-parses the
// body, so on a non-JSON (HTML) response the failed parse still drains
// the stream — a naive .json().catch(() => .text()) fallback then reads
// an already-consumed body and silently gets ''. Every HTML site (real
// example: Instagram's profile page) was always flagged as a false
// positive because of this, regardless of whether the username was
// actually in the page.
test('anti-false-positive verifies HTML bodies correctly, not just JSON ones', async () => {
  const result = await run('octocat', {
    antiFalsePositive: true,
    customSites: ['Instagram=https://instagram.com/{username}/'],
    fetchImpl: fetchFor({
      'api.github.com': () => jsonResponse(404, {}),
      'gitlab.com': () => jsonResponse(404, []),
      'reddit.com': () => jsonResponse(404, {}),
      'dev.to': () => jsonResponse(404, {}),
      'instagram.com': () => ({
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
        text: async () => '<!DOCTYPE html><html><head><title>octocat • Instagram</title></head></html>',
      }),
    }),
  });

  const instagram = result.data.checked.find((c) => c.site === 'Instagram');
  assert.equal(instagram.found, true);
  assert.equal(instagram.verified, true);
});

test('a custom site is checked alongside the built-in list and appears in provenance', async () => {
  const result = await run('octocat', {
    customSites: ['Keybase=https://keybase.io/_/api/1.0/user/lookup.json?username={username}'],
    fetchImpl: fetchFor({
      'api.github.com': () => jsonResponse(404, {}),
      'gitlab.com': () => jsonResponse(404, []),
      'reddit.com': () => jsonResponse(404, {}),
      'dev.to': () => jsonResponse(404, {}),
      'keybase.io': () => jsonResponse(200, { them: [{ basics: { username: 'octocat' } }] }),
    }),
  });

  assert.ok(result.provenance.sources.includes('Keybase'));
  const keybase = result.data.checked.find((c) => c.site === 'Keybase');
  assert.equal(keybase.found, true);
  assert.equal(result.data.matches.some((m) => m.site === 'Keybase'), true);
});

test('a malformed --site value is reported without failing the run', async () => {
  const result = await run('octocat', {
    customSites: ['not-a-valid-entry', 'NoPlaceholder=https://example.com/u'],
    fetchImpl: fetchFor({
      'api.github.com': () => jsonResponse(404, {}),
      'gitlab.com': () => jsonResponse(404, []),
      'reddit.com': () => jsonResponse(404, {}),
      'dev.to': () => jsonResponse(404, {}),
    }),
  });

  assert.equal(result.success, true);
  assert.equal(result.data.customSiteErrors.length, 2);
  assert.ok(result.data.customSiteErrors[0].includes('not-a-valid-entry'));
  assert.ok(result.data.customSiteErrors[1].includes('{username}'));
});
