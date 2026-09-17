// Canned PluginResult payloads, shaped exactly like real output from each
// plugin's run() (see plugins/*/index.js and test/*.test.js) — used so the
// Run screen has something real to render without a backend to call.

import type { PluginResult } from '../types/plugin';

// Mirrors plugins/username-enum/index.js's CUSTOM_SITE_PATTERN /
// parseCustomSite exactly, so the mock produces the same customSiteErrors
// shape the real plugin would for the same --site value.
const CUSTOM_SITE_PATTERN = /^([^=]+)=(.+)$/;

function parseCustomSiteMock(raw: string): { name: string } | { error: string } {
  const match = CUSTOM_SITE_PATTERN.exec(raw);
  const name = match?.[1]?.trim();
  const template = match?.[2]?.trim();

  if (!name || !template) {
    return { error: `Malformed --site value "${raw}" — expected "Name=URLTemplate"` };
  }
  if (!template.includes('{username}')) {
    return { error: `Malformed --site value "${raw}" — URL template must contain "{username}"` };
  }
  return { name };
}

function usernameEnumResult(input: string, options: Record<string, unknown> = {}): PluginResult {
  const antiFalsePositive = Boolean(options.antiFalsePositive);
  const customSites = Array.isArray(options.customSites) ? (options.customSites as string[]) : [];

  // Canned regardless of `antiFalsePositive` or even `input` — this mock
  // has no backend to actually re-check these against. See the
  // antiFalsePositive field's description in mockPlugins.ts.
  const builtIn = [
    { site: 'GitHub', found: true, statusCode: 200 },
    { site: 'GitLab', found: false, statusCode: 200 },
    { site: 'Reddit', found: false, statusCode: 404 },
    { site: 'Dev.to', found: true, statusCode: 200 },
  ];

  const customSiteErrors: string[] = [];
  // Unlike the 4 built-ins above (canned samples — this UI has no backend,
  // so they can't actually reflect `input`), a custom site is a URL
  // nobody has vetted. Simulating it as "200 but the body never mentions
  // the username" is the one place this mock can *honestly* show
  // anti-false-positive doing something: with the flag off it's trusted
  // as a match; with it on, it gets demoted.
  const custom = customSites
    .map(parseCustomSiteMock)
    .filter((parsed) => {
      if ('error' in parsed) {
        customSiteErrors.push(parsed.error);
        return false;
      }
      return true;
    })
    .map((parsed) =>
      antiFalsePositive
        ? { site: (parsed as { name: string }).name, found: false, statusCode: 200, falsePositiveSuspected: true }
        : { site: (parsed as { name: string }).name, found: true, statusCode: 200 },
    );

  const checked = [...builtIn, ...custom];
  const matches = checked.filter((c) => c.found);

  return {
    success: true,
    data: { username: input, matches, checked, customSiteErrors },
    provenance: {
      plugin: 'username-enum',
      pluginVersion: '1.1.0',
      sources: checked.map((c) => c.site),
    },
    timestamp: new Date().toISOString(),
    confidence: checked.length === 0 ? 0 : matches.length / checked.length,
  };
}

export const mockResults: Record<string, (input: string, options?: Record<string, unknown>) => PluginResult> = {
  'username-enum': usernameEnumResult,

  'http-security-headers': (input) => ({
    success: true,
    data: {
      url: input.startsWith('http') ? input : `https://${input}`,
      statusCode: 200,
      headers: {
        'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'deny',
        'referrer-policy': null,
        'permissions-policy': null,
      },
    },
    provenance: {
      plugin: 'http-security-headers',
      pluginVersion: '1.0.0',
      sources: [input.startsWith('http') ? input : `https://${input}`],
    },
    timestamp: new Date().toISOString(),
    confidence: 4 / 6,
  }),

  'metadata-extractor': (input) => ({
    success: true,
    data: {
      format: input.endsWith('.pdf') ? 'pdf' : 'jpeg',
      metadata: input.endsWith('.pdf')
        ? { title: 'Test Doc', author: 'Jane Doe', producer: 'Orwell Test' }
        : { make: 'Canon', model: 'PowerShot', hasGpsData: true },
    },
    provenance: { plugin: 'metadata-extractor', pluginVersion: '1.0.0', sources: [input] },
    timestamp: new Date().toISOString(),
    confidence: 0.75,
  }),
};
