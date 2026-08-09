// Discovers and loads plugins from the plugins/ directory at runtime.
// A plugin is a folder containing plugin.json (manifest) + index.js
// (default export extending OsintPlugin). No central registry file to
// edit — dropping a folder into plugins/ is enough.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OsintPlugin } from './plugin-interface.js';

const REQUIRED_MANIFEST_FIELDS = [
  'id',
  'name',
  'version',
  'author',
  'category',
  'sensitiveData',
  'requiresConsent',
];

/**
 * @typedef {object} LoadedPlugin
 * @property {object} manifest - parsed plugin.json
 * @property {typeof OsintPlugin} PluginClass
 */

/**
 * Read and validate a single plugin's manifest. Split out from
 * `loadPlugins` because the consent-manager and future UI need manifest
 * data (sensitiveData, requiresConsent, category) without ever importing
 * or executing the plugin's code.
 *
 * @param {string} pluginDir - absolute path to the plugin's folder
 * @returns {Promise<object>} the parsed, validated manifest
 */
async function readManifest(pluginDir) {
  const folderName = path.basename(pluginDir);
  const manifestPath = path.join(pluginDir, 'plugin.json');

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
  } catch (err) {
    throw new Error(`Plugin "${folderName}": could not read/parse plugin.json (${err.message})`);
  }

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!(field in manifest)) {
      throw new Error(`Plugin "${folderName}": plugin.json is missing required field "${field}"`);
    }
  }
  if (manifest.id !== folderName) {
    throw new Error(
      `Plugin "${folderName}": plugin.json "id" ("${manifest.id}") must match its folder name`,
    );
  }
  if (typeof manifest.sensitiveData !== 'boolean' || typeof manifest.requiresConsent !== 'boolean') {
    throw new Error(`Plugin "${folderName}": "sensitiveData" and "requiresConsent" must be booleans`);
  }
  manifest.dependencies ??= {};

  return manifest;
}

/**
 * Load one plugin by folder name: validated manifest + its class.
 *
 * @param {string} pluginsDir - absolute path to the plugins/ root
 * @param {string} id - plugin folder name (must match plugin.json "id")
 * @returns {Promise<LoadedPlugin>}
 */
export async function loadPlugin(pluginsDir, id) {
  const pluginDir = path.join(pluginsDir, id);
  const manifest = await readManifest(pluginDir);

  const modUrl = pathToFileURL(path.join(pluginDir, 'index.js')).href;
  const mod = await import(modUrl);
  const PluginClass = mod.default;

  if (typeof PluginClass !== 'function' || !(PluginClass.prototype instanceof OsintPlugin)) {
    throw new Error(`Plugin "${id}": index.js default export must be a class extending OsintPlugin`);
  }

  return { manifest, PluginClass };
}

/**
 * Discover every plugin under plugins/. Used by the CLI's list command and
 * by anything that needs to enumerate available plugins (future UI).
 *
 * @param {string} pluginsDir - absolute path to the plugins/ root
 * @returns {Promise<Map<string, LoadedPlugin>>} keyed by plugin id
 */
export async function loadPlugins(pluginsDir) {
  const entries = await readdir(pluginsDir, { withFileTypes: true });
  const plugins = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const loaded = await loadPlugin(pluginsDir, entry.name);
    plugins.set(loaded.manifest.id, loaded);
  }

  return plugins;
}
