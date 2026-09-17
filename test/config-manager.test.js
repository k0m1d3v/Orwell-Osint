import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envKeyFor, resolvePluginConfig } from '../core/config-manager.js';

test('envKeyFor derives the env var name from a plugin id', () => {
  assert.equal(envKeyFor('wigle-geolocation'), 'ORWELL_WIGLE_GEOLOCATION_API_KEY');
});

test('resolvePluginConfig returns {} for a plugin that does not require an API key', async () => {
  const config = await resolvePluginConfig({ meta: { id: 'username-enum', requiresApiKey: false } });
  assert.deepEqual(config, {});
});

test('resolvePluginConfig throws when a required API key is missing', async () => {
  await assert.rejects(
    () => resolvePluginConfig({ meta: { id: 'no-such-plugin', requiresApiKey: true } }),
    /ORWELL_NO_SUCH_PLUGIN_API_KEY/,
  );
});

test('resolvePluginConfig returns the API key when the env var is set', async () => {
  process.env.ORWELL_FAKE_PLUGIN_API_KEY = 'secret';
  try {
    const config = await resolvePluginConfig({ meta: { id: 'fake-plugin', requiresApiKey: true } });
    assert.deepEqual(config, { apiKey: 'secret' });
  } finally {
    delete process.env.ORWELL_FAKE_PLUGIN_API_KEY;
  }
});
