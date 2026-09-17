<script setup lang="ts">
import type { LoadedPlugin } from '../types/plugin';

defineProps<{ plugin: LoadedPlugin }>();
</script>

<template>
  <div class="card">
    <div class="card__head">
      <div>
        <span class="card__name">{{ plugin.manifest.name }}</span>
        <span class="card__version">{{ plugin.manifest.version }}</span>
      </div>
    </div>
    <div class="card__id">{{ plugin.manifest.id }}</div>
    <p class="card__desc">{{ plugin.description }}</p>

    <div class="card__tags">
      <span class="tag">{{ plugin.manifest.category }}</span>
      <span v-if="plugin.manifest.requiresConsent" class="tag tag--warn">consent required</span>
      <span v-else class="tag tag--ok">no consent needed</span>
      <span v-if="plugin.meta.requiresApiKey" class="tag tag--warn">api key</span>
    </div>

    <div class="card__foot">
      <span class="card__input">in: {{ plugin.meta.inputType }}</span>
      <RouterLink :to="`/run/${plugin.manifest.id}`" class="card__run">Run →</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-panel);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card__name {
  font-weight: 700;
}

.card__version {
  color: var(--text-faint);
  font-size: 11px;
  margin-left: 6px;
}

.card__id {
  color: var(--accent);
  font-size: 12px;
}

.card__desc {
  color: var(--text-dim);
  font-size: 12px;
  margin: 0;
  line-height: 1.5;
}

.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card__foot {
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card__input {
  color: var(--text-faint);
  font-size: 11px;
}

.card__run {
  border: 1px solid var(--accent-dim);
  color: var(--accent);
  border-radius: var(--radius);
  padding: 4px 10px;
  text-decoration: none;
  font-size: 12px;
}

.card__run:hover {
  background: rgba(45, 212, 191, 0.1);
}
</style>
