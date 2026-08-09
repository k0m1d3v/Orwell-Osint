// Reference plugin: checks which common security-related HTTP response
// headers a site sends. Different pattern from username-enum (one fetch
// against the target itself, inspecting its response, rather than
// checking many third-party sites for a match).

import { OsintPlugin } from '../../core/plugin-interface.js';

const CHECKED_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
];

const DEFAULT_TIMEOUT_MS = 5000;

// Only bare domains (no scheme at all) get https:// prepended. A string
// with any other scheme (ftp://, javascript:, ...) is left as-is so
// validate()'s protocol check can reject it, rather than silently
// mangling it into a malformed https:// URL.
function normalizeUrl(input) {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input) ? input : `https://${input}`;
}

export default class HttpSecurityHeadersPlugin extends OsintPlugin {
  static meta = {
    id: 'http-security-headers',
    name: 'HTTP Security Headers Check',
    category: 'network',
    requiresApiKey: false,
    inputType: 'url-or-domain',
    outputType: 'header-report',
  };

  async validate(input) {
    if (typeof input !== 'string' || input.length === 0) {
      return { valid: false, reason: 'Input must be a non-empty URL or domain string' };
    }
    let url;
    try {
      url = new URL(normalizeUrl(input));
    } catch {
      return { valid: false, reason: 'Input must be a valid URL or domain' };
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, reason: 'Only http/https URLs are supported' };
    }
    return { valid: true };
  }

  /**
   * @param {string} input - a URL or bare domain (defaults to https://)
   * @param {object} [config]
   * @param {typeof fetch} [config.fetchImpl] - injectable for tests; defaults to global fetch
   * @param {number} [config.timeoutMs]
   */
  async run(input, config = {}) {
    const fetchImpl = config.fetchImpl || globalThis.fetch;
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    const url = normalizeUrl(input);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'orwell-osint/0.1 (+http-security-headers plugin)' },
        signal: controller.signal,
      });
    } catch (err) {
      return {
        success: false,
        data: null,
        provenance: { plugin: HttpSecurityHeadersPlugin.meta.id, stage: 'run' },
        timestamp: new Date().toISOString(),
        confidence: 0,
        error: err.name === 'AbortError' ? 'Request timed out' : err.message,
      };
    } finally {
      clearTimeout(timer);
    }

    const headers = {};
    for (const header of CHECKED_HEADERS) {
      headers[header] = response.headers.get(header);
    }
    const presentCount = Object.values(headers).filter((v) => v !== null).length;

    return {
      success: true,
      data: { url, statusCode: response.status, headers },
      provenance: {
        plugin: HttpSecurityHeadersPlugin.meta.id,
        pluginVersion: '1.0.0',
        sources: [url],
      },
      timestamp: new Date().toISOString(),
      confidence: presentCount / CHECKED_HEADERS.length,
    };
  }
}
