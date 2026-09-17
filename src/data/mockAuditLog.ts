// Sample entries in the same shape core/audit-log.js writes to
// audit-log.jsonl: plugin, input, outcome, operator, timestamp — never
// the data a plugin returned.

import type { AuditEntry } from '../types/plugin';

export const mockAuditLog: AuditEntry[] = [
  {
    plugin: 'username-enum',
    input: 'octocat',
    outcome: 'success',
    operator: 'operator@localhost',
    timestamp: '2026-09-17T14:02:11.000Z',
  },
  {
    plugin: 'http-security-headers',
    input: 'github.com',
    outcome: 'success',
    operator: 'operator@localhost',
    timestamp: '2026-09-17T14:05:47.000Z',
  },
  {
    plugin: 'metadata-extractor',
    input: './evidence/IMG_4417.jpg',
    outcome: 'success',
    operator: 'operator@localhost',
    timestamp: '2026-09-17T14:08:03.000Z',
  },
  {
    plugin: 'http-security-headers',
    input: 'ftp://not-http.example',
    outcome: 'validation-failed',
    operator: 'operator@localhost',
    timestamp: '2026-09-17T14:11:29.000Z',
  },
  {
    plugin: 'wigle-geolocation',
    input: 'AA:BB:CC:00:11:22',
    outcome: 'consent-denied',
    operator: 'operator@localhost',
    timestamp: '2026-09-17T14:14:56.000Z',
  },
  {
    plugin: 'username-enum',
    input: 'anonymous-1',
    outcome: 'success',
    operator: 'operator@localhost',
    timestamp: '2026-09-17T14:20:02.000Z',
  },
  {
    plugin: 'metadata-extractor',
    input: './evidence/report.pdf',
    outcome: 'success',
    operator: 'operator@localhost',
    timestamp: '2026-09-17T14:26:18.000Z',
  },
  {
    plugin: 'http-security-headers',
    input: 'internal-staging.local',
    outcome: 'failure',
    operator: 'operator@localhost',
    timestamp: '2026-09-17T14:31:40.000Z',
  },
];
