// Enforces the `requiresConsent` flag from a plugin's manifest (plugin.json).
// This is governance enforced by the architecture, not left to individual
// plugins to remember to implement — see PLAN.md §3.4.

/**
 * Thrown when a plugin requires consent and consent was not granted.
 * The pipeline lets this propagate rather than swallowing it into a
 * `{ success: false }` result, so a caller can never accidentally treat
 * "consent denied" the same as "plugin ran and found nothing".
 */
export class ConsentRequiredError extends Error {
  constructor(pluginId) {
    super(`Consent required but not granted for plugin "${pluginId}"`);
    this.name = 'ConsentRequiredError';
    this.pluginId = pluginId;
  }
}

/**
 * @param {object} manifest - a plugin's parsed plugin.json
 * @param {unknown} _input
 * @returns {Promise<boolean>} true if consent is granted
 */
async function defaultCliPrompt(manifest, _input) {
  const { createInterface } = await import('node:readline/promises');
  const { stdin, stdout } = await import('node:process');

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(
      `\n[consent required] "${manifest.name}" (${manifest.id}) is flagged sensitiveData=${manifest.sensitiveData}.\n` +
        `Confirm you are authorized to run this against the target. Type "yes" to continue: `,
    );
    return answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

export class ConsentManager {
  /**
   * @param {object} [options]
   * @param {(manifest: object, input: unknown) => Promise<boolean>} [options.promptFn]
   *   Override for non-interactive contexts (tests, future frontend). Must
   *   return a boolean. Defaults to an interactive CLI y/n prompt.
   */
  constructor({ promptFn } = {}) {
    this.promptFn = promptFn || defaultCliPrompt;
  }

  /**
   * Gate a plugin run on consent. No-op (returns true) when the manifest
   * doesn't require it. When it does, an unanswered or non-affirmative
   * prompt is treated as denial by default — consent is opt-in, never
   * assumed.
   *
   * @param {object} manifest
   * @param {unknown} input
   * @throws {ConsentRequiredError} if consent is required and not granted
   * @returns {Promise<true>}
   */
  async authorize(manifest, input) {
    if (!manifest.requiresConsent) {
      return true;
    }

    const granted = await this.promptFn(manifest, input);
    if (!granted) {
      throw new ConsentRequiredError(manifest.id);
    }
    return true;
  }
}
