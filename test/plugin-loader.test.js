import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlugin, loadPlugins } from '../core/plugin-loader.js';
import { OsintPlugin } from '../core/plugin-interface.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

test('loadPlugin reads plugin.json and index.js for username-enum', async () => {
  const { manifest, PluginClass } = await loadPlugin(PLUGINS_DIR, 'username-enum');

  assert.equal(manifest.id, 'username-enum');
  assert.equal(manifest.sensitiveData, false);
  assert.equal(manifest.requiresConsent, false);
  assert.ok(PluginClass.prototype instanceof OsintPlugin);
});

test('loadPlugin rejects a manifest missing required fields', async () => {
  await assert.rejects(
    () => loadPlugin(path.join(__dirname, 'fixtures'), 'incomplete-plugin'),
    /missing required field/,
  );
});

test('loadPlugins discovers every plugin under plugins/', async () => {
  const plugins = await loadPlugins(PLUGINS_DIR);
  assert.ok(plugins.has('username-enum'));
});
