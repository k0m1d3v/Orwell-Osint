// Reference plugin: checks whether a username exists on a small set of
// public platforms. Low sensitivity (public existence check only, no
// personal data returned) — see README.md in this folder for the rationale
// and docs/PLUGIN_DEVELOPMENT.md for how this was built.

import { OsintPlugin } from '../../core/plugin-interface.js';

// Most platforms distinguish "found" vs "not found" with a plain HTTP
// status (200 vs 404) on a JSON endpoint. GitLab's search endpoint instead
// always returns 200 with an array that's empty when nobody matches, so it
// needs its own check — `checkSite` below handles both shapes.
const SITES = [
  { name: 'GitHub', buildUrl: (u) => `https://api.github.com/users/${encodeURIComponent(u)}` },
  {
    name: 'GitLab',
    buildUrl: (u) => `https://gitlab.com/api/v4/users?username=${encodeURIComponent(u)}`,
    emptyArrayMeansNotFound: true,
  },
  { name: 'Reddit', buildUrl: (u) => `https://www.reddit.com/user/${encodeURIComponent(u)}/about.json` },
  { name: 'Dev.to', buildUrl: (u) => `https://dev.to/api/users/by_username?url=${encodeURIComponent(u)}` },
];

const DEFAULT_TIMEOUT_MS = 5000;

// GitHub username rules are a reasonable superset of most platforms'
// rules: alphanumeric plus single hyphens/underscores, must start with an
// alphanumeric character.
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$/;

// A custom site is supplied as "Name=URLTemplate", e.g.
// "Keybase=https://keybase.io/_/api/1.0/user/lookup.json?username={username}".
// The template must contain the literal "{username}" placeholder.
const CUSTOM_SITE_PATTERN = /^([^=]+)=(.+)$/;

/**
 * @param {string} raw - one --site value, "Name=URLTemplate"
 * @returns {{ site: object } | { error: string }}
 */
function parseCustomSite(raw) {
  const match = CUSTOM_SITE_PATTERN.exec(raw);
  const name = match?.[1]?.trim();
  const template = match?.[2]?.trim();

  if (!name || !template) {
    return { error: `Malformed --site value "${raw}" — expected "Name=URLTemplate"` };
  }
  if (!template.includes('{username}')) {
    return { error: `Malformed --site value "${raw}" — URL template must contain "{username}"` };
  }
  return {
    site: { name, buildUrl: (u) => template.replace('{username}', encodeURIComponent(u)), custom: true },
  };
}

async function checkSite(site, username, fetchImpl, timeoutMs, antiFalsePositive) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(site.buildUrl(username), {
      headers: { 'User-Agent': 'orwell-osint/0.1 (+username-enum plugin)' },
      signal: controller.signal,
    });

    let body;
    let rawFound;
    if (site.emptyArrayMeansNotFound) {
      body = await response.json().catch(() => []);
      rawFound = Array.isArray(body) && body.length > 0;
    } else {
      rawFound = response.status === 200;
    }

    if (!rawFound) {
      return { site: site.name, found: false, statusCode: response.status };
    }
    if (!antiFalsePositive) {
      return { site: site.name, found: true, statusCode: response.status };
    }

    // Anti-false-positive check: some sites return 200 (or, for
    // emptyArrayMeansNotFound sites, a non-empty array) for *any* input —
    // a parked page, a generic profile shell, a catch-all redirect. Read
    // the body and confirm the username actually appears in it before
    // trusting the status code / array-length signal alone.
    //
    // Read as text, never re-attempt json() here: a body can only be read
    // once, and response.json() internally reads-then-parses, so on a
    // non-JSON body (any HTML site — Instagram, GitHub's own profile
    // pages, ...) a failed .json() already drained the stream, leaving a
    // fallback .text() call on the same response silently empty. That
    // previously made every non-JSON site register as a false positive
    // no matter what it actually said.
    if (body === undefined) {
      body = await response.text().catch(() => '');
    }
    const haystack = (typeof body === 'string' ? body : JSON.stringify(body)).toLowerCase();
    const verified = haystack.includes(username.toLowerCase());

    if (!verified) {
      return { site: site.name, found: false, statusCode: response.status, falsePositiveSuspected: true };
    }
    return { site: site.name, found: true, statusCode: response.status, verified: true };
  } catch (err) {
    return { site: site.name, found: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

export default class UsernameEnumPlugin extends OsintPlugin {
  static meta = {
    id: 'username-enum',
    name: 'Username Enumeration',
    category: 'identity',
    requiresApiKey: false,
    inputType: 'username',
    outputType: 'platform-matches',
  };

  async validate(input) {
    if (typeof input !== 'string' || input.length === 0) {
      return { valid: false, reason: 'Input must be a non-empty string' };
    }
    if (!USERNAME_PATTERN.test(input)) {
      return {
        valid: false,
        reason: 'Username must start with a letter/number and contain only letters, numbers, "_" or "-"',
      };
    }
    return { valid: true };
  }

  /**
   * @param {string} input - the username to check
   * @param {object} [config]
   * @param {typeof fetch} [config.fetchImpl] - injectable for tests; defaults to global fetch
   * @param {number} [config.timeoutMs] - per-site request timeout
   * @param {boolean} [config.antiFalsePositive] - verify the username appears in the body,
   *   not just the status code, before counting a site as a match
   * @param {string[]} [config.customSites] - extra sites as "Name=URLTemplate" strings,
   *   checked alongside the built-in list for this run only
   */
  async run(input, config = {}) {
    const fetchImpl = config.fetchImpl || globalThis.fetch;
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    const antiFalsePositive = Boolean(config.antiFalsePositive);

    const parsedCustomSites = (config.customSites || []).map(parseCustomSite);
    const customSiteErrors = parsedCustomSites.filter((r) => 'error' in r).map((r) => r.error);
    const customSites = parsedCustomSites.filter((r) => 'site' in r).map((r) => r.site);
    const sitesToCheck = [...SITES, ...customSites];

    const checked = await Promise.all(
      sitesToCheck.map((site) => checkSite(site, input, fetchImpl, timeoutMs, antiFalsePositive)),
    );
    const matches = checked.filter((result) => result.found);

    return {
      success: true,
      data: { username: input, matches, checked, customSiteErrors },
      provenance: {
        plugin: UsernameEnumPlugin.meta.id,
        pluginVersion: '1.1.0',
        sources: sitesToCheck.map((site) => site.name),
      },
      timestamp: new Date().toISOString(),
      confidence: checked.length === 0 ? 0 : matches.length / checked.length,
    };
  }
}
