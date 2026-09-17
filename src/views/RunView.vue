<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usePluginStore } from '../stores/pluginStore';
import { useAuditStore } from '../stores/auditStore';
import ResultPanel from '../components/ResultPanel.vue';
import ConsentModal from '../components/ConsentModal.vue';
import ConfigureModal from '../components/ConfigureModal.vue';

const props = defineProps<{ pluginId: string }>();
const router = useRouter();
const pluginStore = usePluginStore();
const auditStore = useAuditStore();

const plugin = computed(() => pluginStore.byId(props.pluginId));
const input = ref('');
const showConfigure = ref(false);

const isConfigurable = computed(() => (plugin.value?.configFields?.length ?? 0) > 0);

// A small count so "Configure" shows at a glance whether anything
// non-default is actually set, without opening the panel.
const activeConfigCount = computed(() => {
  if (!plugin.value) return 0;
  const config = pluginStore.configFor(plugin.value.manifest.id);
  let count = 0;
  for (const field of plugin.value.configFields ?? []) {
    if (field.type === 'boolean' && Boolean(config[field.key]) !== field.default) count += 1;
    if (field.type === 'site-list' && Array.isArray(config[field.key]) && (config[field.key] as unknown[]).length > 0) {
      count += (config[field.key] as unknown[]).length;
    }
  }
  return count;
});

function handleConfigureSave(config: Record<string, unknown>) {
  if (!plugin.value) return;
  pluginStore.setRunConfig(plugin.value.manifest.id, config);
  showConfigure.value = false;
}

// Sample input per plugin, so the form isn't empty on first visit —
// mirrors the artifact's pre-filled "octocat" / file-path examples.
const SAMPLE_INPUT: Record<string, string> = {
  'username-enum': 'octocat',
  'http-security-headers': 'github.com',
  'metadata-extractor': './evidence/IMG_4417.jpg',
  'wigle-geolocation': 'AA:BB:CC:00:11:22',
};

watch(
  () => props.pluginId,
  (id) => {
    input.value = SAMPLE_INPUT[id] ?? '';
    pluginStore.resetRun();
  },
  { immediate: true },
);

function handleRun() {
  pluginStore.runPlugin(props.pluginId, input.value);
}

function handleConsentConfirm() {
  pluginStore.runPlugin(props.pluginId, input.value, true).then(() => {
    if (plugin.value) {
      auditStore.record({
        plugin: plugin.value.manifest.id,
        input: input.value,
        outcome: pluginStore.run.status === 'done' ? 'success' : 'failure',
        operator: 'operator@localhost',
        timestamp: new Date().toISOString(),
      });
    }
  });
}

function handleConsentCancel() {
  if (!plugin.value) return;
  auditStore.record({
    plugin: plugin.value.manifest.id,
    input: input.value,
    outcome: 'consent-denied',
    operator: 'operator@localhost',
    timestamp: new Date().toISOString(),
  });
  pluginStore.resetRun();
}
</script>

<template>
  <div v-if="!plugin" class="page">
    <p>Unknown plugin "{{ pluginId }}".</p>
    <button class="link-btn" @click="router.push('/registry')">← back to registry</button>
  </div>

  <div v-else class="page">
    <div class="page__crumb">orwell / <strong>{{ plugin.manifest.id }}</strong></div>

    <div class="run">
      <div class="run__form">
        <RouterLink to="/registry" class="run__back">← registry</RouterLink>
        <h1>
          {{ plugin.manifest.name }} <span class="run__version">{{ plugin.manifest.version }}</span>
        </h1>
        <div class="run__id">{{ plugin.manifest.id }}</div>

        <div class="run__tags">
          <span class="tag">{{ plugin.manifest.category }}</span>
          <span v-if="plugin.manifest.requiresConsent" class="tag tag--warn">consent required</span>
          <span v-else class="tag tag--ok">no consent needed</span>
        </div>

        <p class="run__desc">{{ plugin.description }}</p>

        <label class="run__label section-label">target · {{ plugin.meta.inputType }}</label>
        <input v-model="input" class="run__input" :placeholder="SAMPLE_INPUT[plugin.manifest.id] ?? ''" />

        <div class="run__actions">
          <button class="run__submit" :disabled="pluginStore.run.status === 'running' || !input" @click="handleRun">
            {{ pluginStore.run.status === 'running' ? 'Running…' : 'Run plugin' }}
          </button>
          <button v-if="isConfigurable" class="run__configure" @click="showConfigure = true">
            Configure
            <span v-if="activeConfigCount > 0" class="run__configure-count">{{ activeConfigCount }}</span>
          </button>
        </div>

        <p class="run__hint">
          Every run appends one line to <code>./audit-log.jsonl</code> — plugin, input, outcome, operator, timestamp.
          Never the returned data.
        </p>

        <p v-if="pluginStore.run.status === 'error'" class="run__error">{{ pluginStore.run.errorMessage }}</p>
      </div>

      <div class="run__result">
        <ResultPanel v-if="pluginStore.run.status === 'done' && pluginStore.run.result" :result="pluginStore.run.result" />
        <div v-else class="run__placeholder">
          <template v-if="pluginStore.run.status === 'running'">running…</template>
          <template v-else>
            <div class="run__placeholder-title">awaiting run</div>
            <div class="run__placeholder-sub">
              Results render generically from the standard shape — structured view on the left, raw JSON on the right.
            </div>
          </template>
        </div>
      </div>
    </div>

    <ConsentModal
      v-if="pluginStore.run.status === 'awaiting-consent'"
      :plugin="plugin"
      :input="input"
      @confirm="handleConsentConfirm"
      @cancel="handleConsentCancel"
    />

    <ConfigureModal
      v-if="showConfigure"
      :plugin="plugin"
      :model-value="pluginStore.configFor(plugin.manifest.id)"
      @save="handleConfigureSave"
      @close="showConfigure = false"
    />
  </div>
</template>

<style scoped>
.page {
  padding: 20px 28px 40px;
}

.page__crumb {
  color: var(--text-faint);
  font-size: 12px;
  margin-bottom: 16px;
}

.page__crumb strong {
  color: var(--text-dim);
}

.run {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 28px;
  align-items: start;
}

.run__back {
  color: var(--text-faint);
  font-size: 12px;
  text-decoration: none;
}

h1 {
  font-size: 17px;
  margin: 10px 0 2px;
}

.run__version {
  color: var(--text-faint);
  font-size: 11px;
  font-weight: 400;
}

.run__id {
  color: var(--accent);
  font-size: 12px;
  margin-bottom: 10px;
}

.run__tags {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.run__desc {
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.6;
  margin: 0 0 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.run__label {
  display: block;
  margin-bottom: 6px;
}

.run__input {
  width: 100%;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  padding: 9px 10px;
  font-family: inherit;
  font-size: 13px;
  margin-bottom: 14px;
}

.run__input:focus {
  outline: none;
  border-color: var(--accent-dim);
}

.run__actions {
  display: flex;
  gap: 8px;
}

.run__submit {
  flex: 1;
  background: var(--accent);
  border: none;
  border-radius: var(--radius);
  color: #04201d;
  font-weight: 700;
  font-family: inherit;
  font-size: 13px;
  padding: 10px;
  cursor: pointer;
}

.run__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.run__configure {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 13px;
  padding: 10px 12px;
  cursor: pointer;
}

.run__configure:hover {
  color: var(--text);
  border-color: var(--text-dim);
}

.run__configure-count {
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 999px;
  font-size: 10px;
  padding: 1px 6px;
}

.run__hint {
  color: var(--text-faint);
  font-size: 11px;
  line-height: 1.6;
  margin-top: 12px;
}

.run__hint code {
  color: var(--text-dim);
}

.run__error {
  color: var(--danger);
  font-size: 12px;
  margin-top: 10px;
}

.run__result {
  min-height: 300px;
}

.run__placeholder {
  height: 100%;
  min-height: 300px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  color: var(--text-faint);
}

.run__placeholder-title {
  color: var(--text-dim);
  margin-bottom: 6px;
}

.run__placeholder-sub {
  font-size: 11px;
  max-width: 320px;
}

.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
</style>
