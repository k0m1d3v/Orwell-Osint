// Mirrors the shapes core/plugin-interface.js, core/plugin-loader.js, and
// core/pipeline.js define on the Node side. Keep these in sync by hand —
// there's no shared schema yet, since the CLI and this UI don't talk to
// each other over a wire format.

export type PluginCategory = 'identity' | 'media' | 'geolocation' | 'network' | 'social' | 'documents';

/** Parsed plugin.json — governance flags the loader/consent-manager read without executing plugin code. */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  category: PluginCategory;
  sensitiveData: boolean;
  requiresConsent: boolean;
  dependencies: Record<string, string>;
}

/** The class-level `static meta` every plugin declares (plugin-interface.js). */
export interface PluginMeta {
  id: string;
  name: string;
  category: PluginCategory;
  requiresApiKey: boolean;
  inputType: string;
  outputType: string;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  meta: PluginMeta;
  description: string;
}

/** The standard shape every plugin's run() resolves to (assertValidResult). */
export interface PluginResult {
  success: boolean;
  data: unknown;
  provenance: {
    plugin: string;
    pluginVersion?: string;
    sources?: string[];
    stage?: string;
  };
  timestamp: string;
  confidence: number;
  error?: string;
}

export type AuditOutcome = 'success' | 'failure' | 'validation-failed' | 'consent-denied';

/** One line of audit-log.jsonl — never the plugin's returned data. */
export interface AuditEntry {
  plugin: string;
  input: string;
  outcome: AuditOutcome;
  operator: string;
  timestamp: string;
}
