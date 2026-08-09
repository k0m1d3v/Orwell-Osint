// Persistent local audit log: who ran what plugin against what input,
// and when — never the data a plugin returned. Wired into the pipeline
// unconditionally (see pipeline.js), the same way consent-manager.js is,
// so use is traceable rather than silent. See docs/ETHICS.md §
// "Enforcement in the architecture".

import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_LOG_PATH = path.join(process.cwd(), 'audit-log.jsonl');

export class AuditLog {
  /**
   * @param {object} [options]
   * @param {string} [options.filePath] - defaults to ./audit-log.jsonl
   *   (append-only JSON Lines, one entry per run)
   * @param {boolean} [options.enabled] - set false to no-op (used by
   *   tests, which shouldn't write real files as a side effect)
   * @param {typeof appendFile} [options.appendFileImpl] - injectable for tests
   * @param {typeof mkdir} [options.mkdirImpl] - injectable for tests
   */
  constructor({ filePath = DEFAULT_LOG_PATH, enabled = true, appendFileImpl, mkdirImpl } = {}) {
    this.filePath = filePath;
    this.enabled = enabled;
    this.appendFileImpl = appendFileImpl || appendFile;
    this.mkdirImpl = mkdirImpl || mkdir;
  }

  /**
   * @param {object} entry
   * @param {string} entry.plugin - manifest id
   * @param {unknown} entry.input - what was queried (not what was returned)
   * @param {'success'|'failure'|'validation-failed'|'consent-denied'} entry.outcome
   */
  async record(entry) {
    if (!this.enabled) return;

    const line =
      JSON.stringify({
        timestamp: new Date().toISOString(),
        user: os.userInfo().username,
        plugin: entry.plugin,
        input: entry.input,
        outcome: entry.outcome,
      }) + '\n';

    await this.mkdirImpl(path.dirname(this.filePath), { recursive: true });
    await this.appendFileImpl(this.filePath, line, 'utf-8');
  }
}
