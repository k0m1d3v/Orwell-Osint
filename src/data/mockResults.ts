// Canned PluginResult payloads, shaped exactly like real output from each
// plugin's run() (see plugins/*/index.js and test/*.test.js) — used so the
// Run screen has something real to render without a backend to call.

import type { PluginResult } from '../types/plugin';

export const mockResults: Record<string, (input: string) => PluginResult> = {
  'username-enum': (input) => ({
    success: true,
    data: {
      username: input,
      matches: [
        { site: 'GitHub', found: true, statusCode: 200 },
        { site: 'Dev.to', found: true, statusCode: 200 },
      ],
      checked: [
        { site: 'GitHub', found: true, statusCode: 200 },
        { site: 'GitLab', found: false, statusCode: 200 },
        { site: 'Reddit', found: false, statusCode: 404 },
        { site: 'Dev.to', found: true, statusCode: 200 },
      ],
    },
    provenance: {
      plugin: 'username-enum',
      pluginVersion: '1.0.0',
      sources: ['GitHub', 'GitLab', 'Reddit', 'Dev.to'],
    },
    timestamp: new Date().toISOString(),
    confidence: 0.5,
  }),

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
