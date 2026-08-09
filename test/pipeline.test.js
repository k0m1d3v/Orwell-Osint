import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pipeline } from '../core/pipeline.js';
import { ConsentManager, ConsentRequiredError } from '../core/consent-manager.js';
import { AuditLog } from '../core/audit-log.js';
import { OsintPlugin } from '../core/plugin-interface.js';
import { loadPlugin } from '../core/plugin-loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

// Tests never want a real audit-log.jsonl written to disk as a side
// effect — only the dedicated audit-log wiring tests below care about
// what gets recorded.
const NOOP_AUDIT_LOG = new AuditLog({ enabled: false });

// A fake fetch so this test never makes a real network call. Mirrors the
// shape username-enum's checkSite() expects from `fetchImpl`.
function fakeFetch(url) {
  const found = url.includes('octocat');
  return Promise.resolve({
    status: found ? 200 : 404,
    json: async () => (found ? [{ username: 'octocat' }] : []),
  });
}

test('pipeline runs username-enum end-to-end with an injected fetch', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'username-enum');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const result = await pipeline.runPlugin(loadedPlugin, 'octocat', { fetchImpl: fakeFetch });

  assert.equal(result.success, true);
  assert.equal(result.data.username, 'octocat');
  assert.equal(result.provenance.plugin, 'username-enum');
  assert.ok(Array.isArray(result.data.checked));
});

test('pipeline returns a standard failure result on invalid input, without touching consent or run', async () => {
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'username-enum');
  const pipeline = new Pipeline({ auditLog: NOOP_AUDIT_LOG });

  const result = await pipeline.runPlugin(loadedPlugin, '!!!not a valid username!!!', {});

  assert.equal(result.success, false);
  assert.equal(result.data, null);
  assert.equal(result.provenance.stage, 'validate');
});

// --- consent-manager wiring -------------------------------------------
//
// username-enum has requiresConsent: false, so it never exercises the
// consent gate. These tests use a minimal in-memory plugin (not one that
// lives under plugins/) purely to prove the pipeline -> consent-manager
// wiring works, ahead of any real sensitiveData plugin existing.

class ConsentGatedPlugin extends OsintPlugin {
  static meta = { id: 'consent-gated-fixture', category: 'identity' };
  async validate() {
    return { valid: true };
  }
  async run(input) {
    return {
      success: true,
      data: { input },
      provenance: { plugin: 'consent-gated-fixture' },
      timestamp: new Date().toISOString(),
      confidence: 1,
    };
  }
}

const CONSENT_GATED_MANIFEST = {
  id: 'consent-gated-fixture',
  name: 'Consent Gated Fixture',
  version: '1.0.0',
  author: 'test-fixture',
  category: 'identity',
  sensitiveData: true,
  requiresConsent: true,
  dependencies: {},
};

test('pipeline blocks a requiresConsent plugin when consent is denied', async () => {
  const pipeline = new Pipeline({
    consentManager: new ConsentManager({ promptFn: async () => false }),
    auditLog: NOOP_AUDIT_LOG,
  });

  await assert.rejects(
    () => pipeline.runPlugin({ manifest: CONSENT_GATED_MANIFEST, PluginClass: ConsentGatedPlugin }, 'x', {}),
    ConsentRequiredError,
  );
});

test('pipeline runs a requiresConsent plugin once consent is granted', async () => {
  const pipeline = new Pipeline({
    consentManager: new ConsentManager({ promptFn: async () => true }),
    auditLog: NOOP_AUDIT_LOG,
  });

  const result = await pipeline.runPlugin(
    { manifest: CONSENT_GATED_MANIFEST, PluginClass: ConsentGatedPlugin },
    'x',
    {},
  );

  assert.equal(result.success, true);
  assert.equal(result.data.input, 'x');
});

test('ConsentManager.authorize is a no-op when the manifest does not require consent', async () => {
  const manager = new ConsentManager({ promptFn: async () => false });
  const granted = await manager.authorize({ id: 'username-enum', requiresConsent: false });
  assert.equal(granted, true);
});

// --- audit-log wiring ---------------------------------------------------
//
// Records every outcome path (validate failure, consent denial, success)
// via an in-memory AuditLog (real disk I/O swapped out with injected
// no-op implementations) so this proves the pipeline -> audit-log wiring
// without ever touching the filesystem.

function inMemoryAuditLog() {
  const entries = [];
  const log = new AuditLog({
    appendFileImpl: async (_filePath, line) => {
      entries.push(JSON.parse(line));
    },
    mkdirImpl: async () => {},
  });
  return { log, entries };
}

test('audit log records a validation-failed entry, without the plugin result data', async () => {
  const { log, entries } = inMemoryAuditLog();
  const loadedPlugin = await loadPlugin(PLUGINS_DIR, 'username-enum');
  const pipeline = new Pipeline({ auditLog: log });

  await pipeline.runPlugin(loadedPlugin, '!!!invalid!!!', {});

  assert.equal(entries.length, 1);
  assert.equal(entries[0].plugin, 'username-enum');
  assert.equal(entries[0].input, '!!!invalid!!!');
  assert.equal(entries[0].outcome, 'validation-failed');
  assert.ok(!('data' in entries[0]));
});

test('audit log records a consent-denied entry and a success entry, never the returned data', async () => {
  const { log, entries } = inMemoryAuditLog();

  const denyPipeline = new Pipeline({
    consentManager: new ConsentManager({ promptFn: async () => false }),
    auditLog: log,
  });
  await assert.rejects(() =>
    denyPipeline.runPlugin({ manifest: CONSENT_GATED_MANIFEST, PluginClass: ConsentGatedPlugin }, 'target-x', {}),
  );

  const allowPipeline = new Pipeline({
    consentManager: new ConsentManager({ promptFn: async () => true }),
    auditLog: log,
  });
  await allowPipeline.runPlugin({ manifest: CONSENT_GATED_MANIFEST, PluginClass: ConsentGatedPlugin }, 'target-x', {});

  assert.equal(entries.length, 2);
  assert.equal(entries[0].outcome, 'consent-denied');
  assert.equal(entries[0].input, 'target-x');
  assert.equal(entries[1].outcome, 'success');
  assert.ok(!('data' in entries[1]), 'audit log must never record the plugin result data');
});
