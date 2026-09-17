<script setup lang="ts">
import { computed } from 'vue';
import { usePluginStore } from '../stores/pluginStore';
import { useAuditStore } from '../stores/auditStore';

const pluginStore = usePluginStore();
const auditStore = useAuditStore();

const runLabel = computed(() => pluginStore.lastRunPluginId ?? '—');
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <span class="sidebar__dot" />
      <div>
        <div class="sidebar__brand-name">ORWELL <span class="sidebar__brand-name--dim">OSINT</span></div>
        <div class="sidebar__brand-sub">v0.3 · local runtime</div>
      </div>
    </div>

    <nav class="sidebar__nav">
      <div class="section-label sidebar__section">workspace</div>

      <RouterLink to="/registry" class="sidebar__link" active-class="sidebar__link--active">
        <span>Plugin registry</span>
        <span class="sidebar__link-meta">{{ pluginStore.plugins.length }}</span>
      </RouterLink>

      <RouterLink
        :to="pluginStore.lastRunPluginId ? `/run/${pluginStore.lastRunPluginId}` : '/registry'"
        class="sidebar__link"
        active-class="sidebar__link--active"
      >
        <span>Run</span>
        <span class="sidebar__link-meta">{{ runLabel }}</span>
      </RouterLink>

      <RouterLink to="/audit" class="sidebar__link" active-class="sidebar__link--active">
        <span>Audit trail</span>
        <span class="sidebar__link-meta">{{ auditStore.entries.length }}</span>
      </RouterLink>

      <RouterLink to="/settings" class="sidebar__link" active-class="sidebar__link--active">
        <span>Settings</span>
      </RouterLink>
    </nav>

    <div class="sidebar__loaded">
      <div class="section-label sidebar__section">loaded plugins</div>
      <RouterLink
        v-for="plugin in pluginStore.plugins"
        :key="plugin.manifest.id"
        :to="`/run/${plugin.manifest.id}`"
        class="sidebar__plugin"
      >
        <span class="sidebar__plugin-dot" :class="{ 'sidebar__plugin-dot--sensitive': plugin.manifest.sensitiveData }" />
        {{ plugin.manifest.id }}
      </RouterLink>
    </div>

    <div class="sidebar__footer">
      <div>audit-log.jsonl · recording</div>
      <div>operator@localhost</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 210px;
  flex-shrink: 0;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px 14px;
  gap: 20px;
}

.sidebar__brand {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.sidebar__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  margin-top: 4px;
  flex-shrink: 0;
  box-shadow: 0 0 6px var(--ok);
}

.sidebar__brand-name {
  font-weight: 700;
  letter-spacing: 0.03em;
}

.sidebar__brand-name--dim {
  color: var(--text-dim);
  font-weight: 500;
}

.sidebar__brand-sub {
  font-size: 11px;
  color: var(--text-faint);
  margin-top: 2px;
}

.sidebar__section {
  margin-bottom: 8px;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
}

.sidebar__link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 8px;
  border-radius: var(--radius);
  border-left: 2px solid transparent;
  color: var(--text-dim);
  text-decoration: none;
  font-size: 13px;
}

.sidebar__link:hover {
  color: var(--text);
  background: var(--bg-panel);
}

.sidebar__link--active {
  color: var(--text);
  border-left-color: var(--accent);
  background: var(--bg-panel);
}

.sidebar__link-meta {
  font-size: 11px;
  color: var(--text-faint);
}

.sidebar__loaded {
  flex: 1;
}

.sidebar__plugin {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  color: var(--text-dim);
  text-decoration: none;
  font-size: 12px;
  border-radius: var(--radius);
}

.sidebar__plugin:hover {
  color: var(--text);
  background: var(--bg-panel);
}

.sidebar__plugin-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ok);
  flex-shrink: 0;
}

.sidebar__plugin-dot--sensitive {
  background: var(--warn);
}

.sidebar__footer {
  border-top: 1px solid var(--border);
  padding-top: 10px;
  font-size: 11px;
  color: var(--text-faint);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
