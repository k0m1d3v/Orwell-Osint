// Resolves per-plugin config (API keys, options) from environment
// variables, loading a .env file (if present) on first use. Plugins never
// read process.env directly — they receive resolved config through
// Pipeline#runPlugin's `config` argument. See ORWELL_OSINT_PLAN.md §3.1.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

let dotEnvLoaded = false;

async function loadDotEnv(cwd = process.cwd()) {
  if (dotEnvLoaded) return;
  dotEnvLoaded = true;

  let contents;
  try {
    contents = await readFile(path.join(cwd, '.env'), 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const quoted = /^"(.*)"$|^'(.*)'$/.exec(value);
    if (quoted) value = quoted[1] ?? quoted[2];

    // A real environment variable always wins over .env, so deployments
    // (CI, containers) can override a checked-in-for-local-dev .env.
    if (!(key in process.env)) process.env[key] = value;
  }
}

/**
 * Env var name a plugin's API key is read from, e.g. "wigle-geolocation"
 * -> "ORWELL_WIGLE_GEOLOCATION_API_KEY".
 *
 * @param {string} pluginId
 * @returns {string}
 */
export function envKeyFor(pluginId) {
  return `ORWELL_${pluginId.toUpperCase().replace(/-/g, '_')}_API_KEY`;
}

/**
 * Resolve the config object a plugin's `run(input, config)` should
 * receive. Plugins that don't declare `meta.requiresApiKey` get `{}` —
 * zero config is the default, matching every plugin shipped today.
 *
 * @param {typeof import('./plugin-interface.js').OsintPlugin} PluginClass
 * @returns {Promise<object>}
 */
export async function resolvePluginConfig(PluginClass) {
  await loadDotEnv();

  const meta = PluginClass.meta || {};
  if (!meta.requiresApiKey) return {};

  const envKey = envKeyFor(meta.id);
  const apiKey = process.env[envKey];
  if (!apiKey) {
    throw new Error(
      `Plugin "${meta.id}" requires an API key but ${envKey} is not set (see .env.example)`,
    );
  }
  return { apiKey };
}
