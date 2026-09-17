// Mock plugin registry, standing in for a directory scan of ./plugins.
// The three real plugins mirror their actual plugin.json + static meta
// exactly (see plugins/*/plugin.json). `wigle-geolocation` is a stand-in
// for the sensitive, consent-gated, API-key-gated plugin planned for
// v1.0 (see ORWELL_OSINT_PLAN.md) — it doesn't exist as code yet, so the
// UI can't run it, only display what running it would require.

import type { LoadedPlugin } from '../types/plugin';

export const mockPlugins: LoadedPlugin[] = [
  {
    manifest: {
      id: 'username-enum',
      name: 'Username Enumeration',
      version: '1.0.0',
      author: 'orwell-osint-core',
      category: 'identity',
      sensitiveData: false,
      requiresConsent: false,
      dependencies: {},
    },
    meta: {
      id: 'username-enum',
      name: 'Username Enumeration',
      category: 'identity',
      requiresApiKey: false,
      inputType: 'username',
      outputType: 'platform-matches',
    },
    description:
      'Checks whether a username exists on GitHub, GitLab, Reddit and Dev.to. Public existence check only — no personal data returned.',
  },
  {
    manifest: {
      id: 'http-security-headers',
      name: 'HTTP Security Headers Check',
      version: '1.0.0',
      author: 'orwell-osint-core',
      category: 'network',
      sensitiveData: false,
      requiresConsent: false,
      dependencies: {},
    },
    meta: {
      id: 'http-security-headers',
      name: 'HTTP Security Headers Check',
      category: 'network',
      requiresApiKey: false,
      inputType: 'url-or-domain',
      outputType: 'header-report',
    },
    description: 'One request against the target, inspecting which of six common security headers the response carries.',
  },
  {
    manifest: {
      id: 'metadata-extractor',
      name: 'File Metadata Extractor',
      version: '1.0.0',
      author: 'orwell-osint-core',
      category: 'media',
      sensitiveData: false,
      requiresConsent: false,
      dependencies: {},
    },
    meta: {
      id: 'metadata-extractor',
      name: 'File Metadata Extractor',
      category: 'media',
      requiresApiKey: false,
      inputType: 'file-path',
      outputType: 'file-metadata',
    },
    description: 'Reads JPEG EXIF and PDF /Info from a local file. GPS presence is flagged, never decoded into coordinates.',
  },
  {
    manifest: {
      id: 'wigle-geolocation',
      name: 'WiGLE Geolocation',
      version: '0.0.0',
      author: 'orwell-osint-core',
      category: 'geolocation',
      sensitiveData: true,
      requiresConsent: true,
      dependencies: {},
    },
    meta: {
      id: 'wigle-geolocation',
      name: 'WiGLE Geolocation',
      category: 'geolocation',
      requiresApiKey: true,
      inputType: 'bssid',
      outputType: 'coordinates',
    },
    description:
      'Planned for v1.0 — resolves a WiFi BSSID to approximate coordinates via the WiGLE API. Not built yet; shown here so the consent + API-key flows have something real to design against.',
  },
];
