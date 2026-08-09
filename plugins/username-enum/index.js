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

async function checkSite(site, username, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(site.buildUrl(username), {
      headers: { 'User-Agent': 'orwell-osint/0.1 (+username-enum plugin)' },
      signal: controller.signal,
    });

    if (site.emptyArrayMeansNotFound) {
      const body = await response.json().catch(() => []);
      return { site: site.name, found: Array.isArray(body) && body.length > 0, statusCode: response.status };
    }

    return { site: site.name, found: response.status === 200, statusCode: response.status };
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
   */
  async run(input, config = {}) {
    const fetchImpl = config.fetchImpl || globalThis.fetch;
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;

    const checked = await Promise.all(SITES.map((site) => checkSite(site, input, fetchImpl, timeoutMs)));
    const matches = checked.filter((result) => result.found);

    return {
      success: true,
      data: { username: input, matches, checked },
      provenance: {
        plugin: UsernameEnumPlugin.meta.id,
        pluginVersion: '1.0.0',
        sources: SITES.map((site) => site.name),
      },
      timestamp: new Date().toISOString(),
      confidence: checked.length === 0 ? 0 : matches.length / checked.length,
    };
  }
}
