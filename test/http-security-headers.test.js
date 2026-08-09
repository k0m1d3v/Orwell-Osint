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

function fakeFetch(headerValues) {
  return async () => ({
    status: 200,
    headers: { get: (name) => headerValues[name] ?? null },
  });
}

test('reports present and absent security headers', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'http-security-headers');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const fetchImpl = fakeFetch({
    'strict-transport-security': 'max-age=63072000',
    'x-content-type-options': 'nosniff',
  });

  const result = await pipeline.runPlugin(loadedPlugin, 'example.com', { fetchImpl });

  assert.equal(result.success, true);
  assert.equal(result.data.url, 'https://example.com');
  assert.equal(result.data.headers['strict-transport-security'], 'max-age=63072000');
  assert.equal(result.data.headers['content-security-policy'], null);
  assert.equal(result.confidence, 2 / 6);
});

test('rejects invalid input at validate() before making a request', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'http-security-headers');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const result = await pipeline.runPlugin(loadedPlugin, 'ftp://not-http.example', {
    fetchImpl: async () => {
      throw new Error('fetch should not be called for invalid input');
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.provenance.stage, 'validate');
});

test('returns a standard failure result when the request errors', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'http-security-headers');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const result = await pipeline.runPlugin(loadedPlugin, 'example.com', {
    fetchImpl: async () => {
      throw new Error('network down');
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.data, null);
  assert.match(result.error, /network down/);
});
