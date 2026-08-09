// The contract every plugin must implement. Read this file first if you're
// new to the project — it's the whole interface, nothing else is implicit.

/**
 * Base class every Orwell OSINT plugin extends.
 *
 * A plugin is two things together:
 *   1. plugin.json  — static metadata the loader can read without executing
 *      any code (id, category, sensitiveData, requiresConsent, ...).
 *   2. index.js      — this class, implementing `validate` and `run`.
 *
 * `static meta` here is for implementation-level details that plugin.json
 * doesn't carry (inputType/outputType, requiresApiKey). Governance flags
 * (sensitiveData, requiresConsent) live in plugin.json because the loader
 * and consent-manager must be able to read them without importing/running
 * plugin code.
 */
export class OsintPlugin {
  static meta = {
    id: null,
    name: null,
    category: null, // identity | media | geolocation | network | social | documents
    requiresApiKey: false,
    inputType: null,
    outputType: null,
  };

  /**
   * Validate raw input before it reaches `run`. Never perform network calls
   * or side effects here — this must be cheap and synchronous-feeling.
   *
   * @param {unknown} input
   * @returns {Promise<{ valid: true } | { valid: false, reason: string }>}
   */
  async validate(_input) {
    throw new Error(`${this.constructor.name} must implement validate(input)`);
  }

  /**
   * Execute the plugin. Must always resolve to the standard result shape
   * (see `assertValidResult` below) — never throw for expected failure
   * modes (target not found, rate limited, etc.); return
   * `{ success: false, ... }` instead. Throwing is reserved for bugs and
   * infrastructure failures (network down, bad config).
   *
   * @param {unknown} input - input that already passed `validate`
   * @param {object} config - resolved plugin config (API keys, options)
   * @returns {Promise<PluginResult>}
   */
  async run(_input, _config) {
    throw new Error(`${this.constructor.name} must implement run(input, config)`);
  }
}

/**
 * @typedef {object} PluginResult
 * @property {boolean} success
 * @property {unknown} data - null/empty when success is false
 * @property {object} provenance - where the data came from (sources, plugin id/version)
 * @property {string} timestamp - ISO 8601
 * @property {number} confidence - 0..1
 */

const REQUIRED_RESULT_FIELDS = ['success', 'data', 'provenance', 'timestamp', 'confidence'];

/**
 * Enforces the standard output shape every plugin's `run()` must return.
 * The pipeline calls this after every plugin run so that a single
 * reporting/export layer can trust the shape regardless of which plugin
 * produced it.
 *
 * @param {object} result
 * @param {string} pluginId - for error messages
 * @returns {object} the same result, unchanged, if valid
 */
export function assertValidResult(result, pluginId) {
  if (result === null || typeof result !== 'object') {
    throw new TypeError(`Plugin "${pluginId}" run() must return an object, got ${typeof result}`);
  }
  for (const field of REQUIRED_RESULT_FIELDS) {
    if (!(field in result)) {
      throw new TypeError(`Plugin "${pluginId}" run() result is missing required field "${field}"`);
    }
  }
  if (typeof result.success !== 'boolean') {
    throw new TypeError(`Plugin "${pluginId}" run() result.success must be a boolean`);
  }
  return result;
}
