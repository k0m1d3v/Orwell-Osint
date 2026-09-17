<script setup lang="ts">
defineProps<{ value: unknown; label?: string }>();

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
</script>

<template>
  <div class="node">
    <template v-if="Array.isArray(value)">
      <div v-if="label" class="node__key">{{ label }} <span class="node__hint">[{{ value.length }}]</span></div>
      <div class="node__children">
        <JsonTree v-for="(item, i) in value" :key="i" :value="item" :label="String(i)" />
      </div>
    </template>
    <template v-else-if="isObject(value)">
      <div v-if="label" class="node__key">{{ label }}</div>
      <div class="node__children">
        <JsonTree v-for="(v, k) in value" :key="k" :value="v" :label="k" />
      </div>
    </template>
    <template v-else>
      <div class="node__leaf">
        <span class="node__key">{{ label }}</span>
        <span class="node__value" :class="`node__value--${typeof value}`">{{ value === null ? 'null' : String(value) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.node__children {
  margin-left: 14px;
  border-left: 1px solid var(--border);
  padding-left: 10px;
}

.node__key {
  color: var(--text-dim);
}

.node__hint {
  color: var(--text-faint);
}

.node__leaf {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

.node__value {
  color: var(--text);
}

.node__value--boolean {
  color: var(--warn);
}

.node__value--number {
  color: var(--accent);
}
</style>
