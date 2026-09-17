<script setup lang="ts">
import { computed } from 'vue';
import type { PluginResult } from '../types/plugin';
import JsonTree from './JsonTree.vue';

const props = defineProps<{ result: PluginResult }>();

const confidencePct = computed(() => Math.round(props.result.confidence * 100));
const rawJson = computed(() => JSON.stringify(props.result, null, 2));
</script>

<template>
  <div class="result">
    <div class="result__meta">
      <span class="tag" :class="result.success ? 'tag--ok' : 'tag--warn'">
        {{ result.success ? 'success' : 'failed' }}
      </span>
      <span class="result__meta-item">plugin: {{ result.provenance.plugin }}@{{ result.provenance.pluginVersion ?? '?' }}</span>
      <span class="result__meta-item">confidence: {{ confidencePct }}%</span>
      <span class="result__meta-item">{{ result.timestamp }}</span>
    </div>
    <div v-if="result.provenance.sources?.length" class="result__sources">
      sources: {{ result.provenance.sources.join(', ') }}
    </div>

    <div class="result__panes">
      <div class="pane">
        <div class="pane__label section-label">structured</div>
        <div class="pane__body">
          <JsonTree :value="result.data" />
        </div>
      </div>
      <div class="pane">
        <div class="pane__label section-label">raw json</div>
        <pre class="pane__body pane__body--raw">{{ rawJson }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result__meta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.result__meta-item {
  color: var(--text-faint);
  font-size: 12px;
}

.result__sources {
  color: var(--text-faint);
  font-size: 11px;
  margin-bottom: 14px;
}

.result__panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.pane {
  background: var(--bg-panel);
  min-width: 0;
}

.pane__label {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.pane__body {
  padding: 12px;
  font-size: 12px;
  max-height: 480px;
  overflow: auto;
}

.pane__body--raw {
  margin: 0;
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
