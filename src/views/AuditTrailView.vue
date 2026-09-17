<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuditStore } from '../stores/auditStore';
import type { AuditOutcome } from '../types/plugin';

const auditStore = useAuditStore();
const query = ref('');

const OUTCOME_CLASS: Record<AuditOutcome, string> = {
  success: 'tag--ok',
  failure: 'tag--warn',
  'validation-failed': 'tag--warn',
  'consent-denied': 'tag--warn',
};

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return auditStore.sorted;
  return auditStore.sorted.filter(
    (e) => e.plugin.toLowerCase().includes(q) || e.input.toLowerCase().includes(q) || e.outcome.includes(q),
  );
});
</script>

<template>
  <div class="page">
    <div class="page__crumb">orwell / <strong>audit-trail</strong></div>

    <div class="page__header">
      <div>
        <h1>Audit trail</h1>
        <p class="page__sub">
          Read-only. Every plugin run appends one line to <code>./audit-log.jsonl</code> — plugin, input, outcome, operator,
          timestamp. The data a plugin returned is never written here.
        </p>
      </div>
      <span class="tag">{{ auditStore.entries.length }} entries</span>
    </div>

    <input v-model="query" class="search" placeholder="filter by plugin, input, or outcome…" />

    <table class="table">
      <thead>
        <tr>
          <th>timestamp</th>
          <th>plugin</th>
          <th>input</th>
          <th>outcome</th>
          <th>operator</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, i) in filtered" :key="i">
          <td class="table__dim">{{ entry.timestamp }}</td>
          <td>{{ entry.plugin }}</td>
          <td class="table__input">{{ entry.input }}</td>
          <td><span class="tag" :class="OUTCOME_CLASS[entry.outcome]">{{ entry.outcome }}</span></td>
          <td class="table__dim">{{ entry.operator }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="filtered.length === 0" class="empty">No entries match "{{ query }}".</p>
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
  max-width: 620px;
  line-height: 1.6;
}

.page__sub code {
  color: var(--text);
}

.search {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  padding: 6px 10px;
  font-family: inherit;
  font-size: 12px;
  min-width: 260px;
  margin-bottom: 16px;
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
  padding: 8px 10px;
}

.table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}

.table__dim {
  color: var(--text-faint);
}

.table__input {
  color: var(--text-dim);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  color: var(--text-faint);
  font-size: 13px;
  margin-top: 16px;
}
</style>
