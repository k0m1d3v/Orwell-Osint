// Orchestrator: runs a single plugin end-to-end (validate -> consent ->
// run -> shape check) and returns a standard result. This is the one
// place all three core pieces (interface, loader's output, consent
// manager) meet, so it's also the place that enforces the contract.

import { assertValidResult } from './plugin-interface.js';
import { ConsentManager, ConsentRequiredError } from './consent-manager.js';
import { AuditLog } from './audit-log.js';

export class Pipeline {
  /**
   * @param {object} [options]
   * @param {ConsentManager} [options.consentManager]
   * @param {AuditLog} [options.auditLog]
   */
  constructor({ consentManager, auditLog } = {}) {
    this.consentManager = consentManager || new ConsentManager();
    this.auditLog = auditLog || new AuditLog();
  }

  /**
   * @param {{ manifest: object, PluginClass: Function }} loadedPlugin - as returned by plugin-loader
   * @param {unknown} input
   * @param {object} [config] - resolved plugin config (API keys, options)
   * @returns {Promise<import('./plugin-interface.js').PluginResult>}
   */
  async runPlugin({ manifest, PluginClass }, input, config = {}) {
    const plugin = new PluginClass();

    const validation = await plugin.validate(input);
    if (validation && validation.valid === false) {
      await this.auditLog.record({ plugin: manifest.id, input, outcome: 'validation-failed' });
      return {
        success: false,
        data: null,
        provenance: { plugin: manifest.id, stage: 'validate' },
        timestamp: new Date().toISOString(),
        confidence: 0,
        error: validation.reason || 'Input failed validation',
      };
    }

    // Consent is checked after validation (no point prompting for bad
    // input) and before run() (must never execute an unconsented,
    // sensitive-flagged plugin). Throws ConsentRequiredError on denial —
    // deliberately not downgraded to a { success: false } result, see
    // consent-manager.js.
    try {
      await this.consentManager.authorize(manifest, input);
    } catch (err) {
      if (err instanceof ConsentRequiredError) {
        await this.auditLog.record({ plugin: manifest.id, input, outcome: 'consent-denied' });
      }
      throw err;
    }

    const result = await plugin.run(input, config);
    assertValidResult(result, manifest.id);
    await this.auditLog.record({
      plugin: manifest.id,
      input,
      outcome: result.success ? 'success' : 'failure',
    });
    return result;
  }
}
