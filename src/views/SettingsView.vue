<script setup lang="ts">
import { computed } from 'vue';
import { usePluginStore } from '../stores/pluginStore';
import { envKeyFor } from '../utils/env';

const pluginStore = usePluginStore();

const apiKeyPlugins = computed(() => pluginStore.plugins.filter((p) => p.meta.requiresApiKey));
</script>

<template>
  <div class="page">
    <div class="page__crumb">orwell / <strong>settings</strong></div>

    <h1>Settings</h1>
    <p class="page__sub">
      Local configuration only. Keys are read from the environment or a local <code>.env</code> file (see
      <code>.env.example</code>) and are never sent anywhere except the declared API of the plugin that needs them.
    </p>

    <section class="block">
      <div class="section-label block__label">api keys</div>
      <div v-for="plugin in apiKeyPlugins" :key="plugin.manifest.id" class="key-row">
        <div>
          <div class="key-row__name">{{ plugin.manifest.name }}</div>
          <div class="key-row__env">{{ envKeyFor(plugin.manifest.id) }}</div>
        </div>
        <input class="key-row__input" disabled :placeholder="`not set — required by ${plugin.manifest.id}`" />
        <span class="tag tag--warn">missing</span>
      </div>
      <p class="block__note">
        No plugin shipping today requires a key. <code>wigle-geolocation</code> (planned, v1.0) will refuse to resolve
        config without one — see <code>core/config-manager.js</code>.
      </p>
    </section>

    <section class="block">
      <div class="section-label block__label">plugin manifests · read-only</div>
      <table class="table">
        <thead>
          <tr>
            <th>id</th>
            <th>author</th>
            <th>category</th>
            <th>sensitive</th>
            <th>consent</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plugin in pluginStore.plugins" :key="plugin.manifest.id">
            <td class="table__id">{{ plugin.manifest.id }}</td>
            <td class="table__dim">{{ plugin.manifest.author }}</td>
            <td class="table__dim">{{ plugin.manifest.category }}</td>
            <td :class="plugin.manifest.sensitiveData ? 'table__warn' : 'table__dim'">{{ plugin.manifest.sensitiveData }}</td>
            <td :class="plugin.manifest.requiresConsent ? 'table__warn' : 'table__dim'">{{ plugin.manifest.requiresConsent }}</td>
          </tr>
        </tbody>
      </table>
      <p class="block__note">
        Governance flags live in plugin.json so the loader and consent manager can read them without importing plugin
        code. They are not editable from the UI, by design.
      </p>
    </section>

    <section class="block">
      <div class="section-label block__label">paths</div>
      <dl class="paths">
        <dt>plugins dir</dt>
        <dd>./plugins</dd>
        <dt>audit log</dt>
        <dd>./audit-log.jsonl</dd>
        <dt>node</dt>
        <dd>&gt;= 18.18</dd>
        <dt>license</dt>
        <dd>AGPL-3.0</dd>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 28px 40px;
  max-width: 900px;
}

.page__crumb {
  color: var(--text-faint);
  font-size: 12px;
  margin-bottom: 16px;
}

.page__crumb strong {
  color: var(--text-dim);
}

h1 {
  margin: 0 0 6px;
  font-size: 20px;
}

.page__sub {
  color: var(--text-dim);
  font-size: 12px;
  max-width: 640px;
  line-height: 1.6;
  margin: 0 0 24px;
}

.page__sub code {
  color: var(--text);
}

.block {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-panel);
  padding: 16px;
  margin-bottom: 16px;
}

.block__label {
  margin-bottom: 12px;
}

.block__note {
  color: var(--text-faint);
  font-size: 11px;
  line-height: 1.6;
  margin: 10px 0 0;
}

.block__note code {
  color: var(--text-dim);
}

.key-row {
  display: grid;
  grid-template-columns: 200px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.key-row:last-of-type {
  border-bottom: none;
}

.key-row__name {
  font-size: 13px;
}

.key-row__env {
  color: var(--text-faint);
  font-size: 11px;
}

.key-row__input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-faint);
  padding: 7px 10px;
  font-family: inherit;
  font-size: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.table th {
  text-align: left;
  color: var(--text-faint);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
  border-bottom: 1px solid var(--border);
  padding: 6px 8px;
}

.table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}

.table__id {
  color: var(--accent);
}

.table__dim {
  color: var(--text-dim);
}

.table__warn {
  color: var(--warn);
}

.paths {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 12px;
  margin: 0;
  font-size: 12px;
}

.paths dt {
  color: var(--text-faint);
}

.paths dd {
  margin: 0;
  color: var(--text-dim);
}
</style>
