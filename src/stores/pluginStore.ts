// Client-side stand-in for what a real backend would provide: the plugin
// registry (from scanning ./plugins), a run action, and consent state.
// There's no HTTP API yet (see PROJECT_CONTEXT.md / README — CLI only),
// so `runPlugin` below simulates the pipeline against canned results
// instead of calling anything real. Swapping this store's internals for
// real fetch() calls is the intended integration point once a backend
// exists — components should never need to change.

import { defineStore } from 'pinia';
import { mockPlugins } from '../data/mockPlugins';
import { mockResults } from '../data/mockResults';
import type { LoadedPlugin, PluginResult } from '../types/plugin';

interface RunState {
  status: 'idle' | 'awaiting-consent' | 'running' | 'done' | 'error';
  result: PluginResult | null;
  errorMessage: string | null;
}

export const usePluginStore = defineStore('plugins', {
  state: () => ({
    plugins: mockPlugins as LoadedPlugin[],
    lastRunPluginId: null as string | null,
    run: {
      status: 'idle',
      result: null,
      errorMessage: null,
    } as RunState,
    // Per-plugin configured options from the "Configure" panel (keyed by
    // plugin id), e.g. { 'username-enum': { antiFalsePositive: true,
    // customSites: ['Keybase=https://keybase.io/{username}'] } }. Kept
    // separate from `run` so it survives across runs of the same plugin.
    runConfig: {} as Record<string, Record<string, unknown>>,
  }),
  getters: {
    byId: (state) => (id: string) => state.plugins.find((p) => p.manifest.id === id),
    categories: (state) => {
      const set = new Set(state.plugins.map((p) => p.manifest.category));
      return Array.from(set).sort();
    },
    configFor: (state) => (pluginId: string) => state.runConfig[pluginId] ?? {},
  },
  actions: {
    setRunConfig(pluginId: string, config: Record<string, unknown>) {
      this.runConfig[pluginId] = config;
    },
    /**
     * Mirrors Pipeline#runPlugin's shape: consent gates before run, and a
     * missing API key surfaces the same way config-manager.js's
     * resolvePluginConfig throws — as a run failure, not a silent no-op.
     * Whatever was set via setRunConfig() for this plugin (e.g.
     * antiFalsePositive, customSites) rides along, same as cli.js merging
     * --anti-false-positive/--site into the config it passes the pipeline.
     */
    async runPlugin(pluginId: string, input: string, consentGranted = false) {
      const plugin = this.byId(pluginId);
      if (!plugin) return;
      this.lastRunPluginId = pluginId;

      if (plugin.manifest.requiresConsent && !consentGranted) {
        this.run = { status: 'awaiting-consent', result: null, errorMessage: null };
        return;
      }

      if (plugin.meta.requiresApiKey) {
        this.run = {
          status: 'error',
          result: null,
          errorMessage: `Plugin "${pluginId}" requires an API key but ORWELL_${pluginId
            .toUpperCase()
            .replace(/-/g, '_')}_API_KEY is not set (see Settings).`,
        };
        return;
      }

      this.run = { status: 'running', result: null, errorMessage: null };

      const build = mockResults[pluginId];
      // Simulated latency so "running" state is visibly reachable in the UI.
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (!build) {
        this.run = {
          status: 'error',
          result: null,
          errorMessage: `No mock result wired up for "${pluginId}" yet.`,
        };
        return;
      }

      this.run = { status: 'done', result: build(input, this.configFor(pluginId)), errorMessage: null };
    },
    resetRun() {
      this.run = { status: 'idle', result: null, errorMessage: null };
    },
  },
});
