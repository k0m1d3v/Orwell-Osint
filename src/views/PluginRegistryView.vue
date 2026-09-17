<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePluginStore } from '../stores/pluginStore';
import PluginCard from '../components/PluginCard.vue';
import type { PluginCategory } from '../types/plugin';

const pluginStore = usePluginStore();
const filter = ref<'all' | PluginCategory>('all');
const query = ref('');

const filtered = computed(() =>
  pluginStore.plugins.filter((p) => {
    const matchesCategory = filter.value === 'all' || p.manifest.category === filter.value;
    const q = query.value.trim().toLowerCase();
    const matchesQuery =
      q.length === 0 || p.manifest.id.includes(q) || p.manifest.name.toLowerCase().includes(q) || p.manifest.category.includes(q);
    return matchesCategory && matchesQuery;
  }),
);

const grouped = computed(() => {
  const byCategory = new Map<string, typeof filtered.value>();
  for (const plugin of filtered.value) {
    const list = byCategory.get(plugin.manifest.category) ?? [];
    list.push(plugin);
    byCategory.set(plugin.manifest.category, list);
  }
  return [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b));
});

const sensitiveCount = computed(() => pluginStore.plugins.filter((p) => p.manifest.sensitiveData).length);
</script>

<template>
  <div class="page">
    <div class="page__crumb">orwell / <strong>plugin-registry</strong></div>

    <div class="page__header">
      <div>
        <h1>Plugin registry</h1>
        <p class="page__sub">
          Discovered by scanning <code>./plugins</code>. Metadata is read from each manifest without executing plugin code.
        </p>
      </div>
      <div class="page__stats">
        <span class="tag">{{ pluginStore.plugins.length }} plugins</span>
        <span class="tag" :class="{ 'tag--warn': sensitiveCount > 0 }">{{ sensitiveCount }} sensitive</span>
      </div>
    </div>

    <div class="filters">
      <input v-model="query" class="filters__search" placeholder="filter by id, name, category…" />
      <button class="filters__chip" :class="{ 'filters__chip--active': filter === 'all' }" @click="filter = 'all'">
        all {{ pluginStore.plugins.length }}
      </button>
      <button
        v-for="category in pluginStore.categories"
        :key="category"
        class="filters__chip"
        :class="{ 'filters__chip--active': filter === category }"
        @click="filter = category"
      >
        {{ category }}
      </button>
    </div>

    <section v-for="[category, plugins] in grouped" :key="category" class="group">
      <div class="group__label">
        <span class="section-label">{{ category }}</span>
        <span class="group__count">{{ plugins.length }} plugin{{ plugins.length === 1 ? '' : 's' }}</span>
      </div>
      <div class="group__grid">
        <PluginCard v-for="plugin in plugins" :key="plugin.manifest.id" :plugin="plugin" />
      </div>
    </section>

    <p v-if="filtered.length === 0" class="empty">No plugins match "{{ query }}".</p>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 28px 40px;
  max-width: 1100px;
}

.page__crumb {
  color: var(--text-faint);
  font-size: 12px;
  margin-bottom: 16px;
}

.page__crumb strong {
  color: var(--text-dim);
}

.page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
  gap: 16px;
}

h1 {
  margin: 0 0 6px;
  font-size: 20px;
}

.page__sub {
  margin: 0;
  color: var(--text-dim);
  font-size: 12px;
  max-width: 560px;
}

.page__sub code {
  color: var(--text);
}

.page__stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.filters {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filters__search {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  padding: 6px 10px;
  font-family: inherit;
  font-size: 12px;
  min-width: 220px;
}

.filters__chip {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-dim);
  padding: 5px 10px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}

.filters__chip--active {
  border-color: var(--accent-dim);
  color: var(--accent);
  background: rgba(45, 212, 191, 0.08);
}

.group {
  margin-bottom: 26px;
}

.group__label {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 6px;
  margin-bottom: 12px;
}

.group__count {
  font-size: 11px;
  color: var(--text-faint);
}

.group__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.empty {
  color: var(--text-faint);
  font-size: 13px;
}
</style>
