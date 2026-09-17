<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { LoadedPlugin } from '../types/plugin';

const props = defineProps<{ plugin: LoadedPlugin; modelValue: Record<string, unknown> }>();
const emit = defineEmits<{ save: [config: Record<string, unknown>]; close: [] }>();

const booleans = reactive<Record<string, boolean>>({});
for (const field of props.plugin.configFields ?? []) {
  if (field.type === 'boolean') {
    booleans[field.key] = (props.modelValue[field.key] as boolean | undefined) ?? field.default;
  }
}

// Edited as separate name/template fields for usability; serialized back
// to "Name=Template" strings on save — the exact shape
// plugins/username-enum/index.js's parseCustomSite() expects from --site.
const siteRows = ref(
  ((props.modelValue.customSites as string[] | undefined) ?? []).map((raw) => {
    const eq = raw.indexOf('=');
    return eq === -1 ? { name: raw, template: '' } : { name: raw.slice(0, eq), template: raw.slice(eq + 1) };
  }),
);

function addSiteRow() {
  siteRows.value.push({ name: '', template: '' });
}

function removeSiteRow(index: number) {
  siteRows.value.splice(index, 1);
}

function siteRowError(row: { name: string; template: string }): string | null {
  if (!row.name.trim() && !row.template.trim()) return null;
  if (!row.name.trim() || !row.template.trim()) return 'Both name and URL template are required.';
  if (!row.template.includes('{username}')) return 'Template must contain a literal {username} placeholder.';
  return null;
}

function handleSave() {
  const config: Record<string, unknown> = { ...booleans };
  const customSites = siteRows.value
    .filter((row) => row.name.trim() || row.template.trim())
    .map((row) => `${row.name.trim()}=${row.template.trim()}`);
  if (props.plugin.configFields?.some((f) => f.type === 'site-list')) {
    config.customSites = customSites;
  }
  emit('save', config);
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal__head">
        <h2 class="modal__title">Configure {{ plugin.manifest.name }}</h2>
        <button class="modal__close" @click="emit('close')">×</button>
      </div>

      <div v-for="field in plugin.configFields" :key="field.key" class="field">
        <template v-if="field.type === 'boolean'">
          <label class="field__toggle">
            <input v-model="booleans[field.key]" type="checkbox" />
            <span class="field__label">{{ field.label }}</span>
          </label>
          <p class="field__desc">{{ field.description }}</p>
        </template>

        <template v-else-if="field.type === 'site-list'">
          <div class="field__label">{{ field.label }}</div>
          <p class="field__desc">{{ field.description }}</p>

          <div v-for="(row, i) in siteRows" :key="i" class="site-row">
            <div class="site-row__inputs">
              <input v-model="row.name" class="site-row__input site-row__input--name" placeholder="Name" />
              <input
                v-model="row.template"
                class="site-row__input site-row__input--template"
                placeholder="https://example.com/u/{username}"
              />
              <button class="site-row__remove" title="Remove" @click="removeSiteRow(i)">×</button>
            </div>
            <p v-if="siteRowError(row)" class="site-row__error">{{ siteRowError(row) }}</p>
          </div>

          <button class="field__add" @click="addSiteRow">+ add site</button>
        </template>
      </div>

      <div class="modal__actions">
        <button class="modal__btn modal__btn--ghost" @click="emit('close')">Cancel</button>
        <button class="modal__btn modal__btn--save" @click="handleSave">Save configuration</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}

.modal {
  width: 520px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--bg-panel-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 20px;
}

.modal__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal__title {
  font-size: 14px;
  margin: 0;
}

.modal__close {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}

.field {
  border-top: 1px solid var(--border);
  padding: 14px 0;
}

.field:first-of-type {
  border-top: none;
  padding-top: 0;
}

.field__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.field__label {
  font-size: 13px;
  font-weight: 600;
}

.field__desc {
  color: var(--text-dim);
  font-size: 11px;
  line-height: 1.6;
  margin: 6px 0 10px;
}

.site-row {
  margin-bottom: 8px;
}

.site-row__inputs {
  display: flex;
  gap: 6px;
}

.site-row__input {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  padding: 6px 8px;
  font-family: inherit;
  font-size: 12px;
}

.site-row__input--name {
  width: 110px;
  flex-shrink: 0;
}

.site-row__input--template {
  flex: 1;
  min-width: 0;
}

.site-row__remove {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-faint);
  cursor: pointer;
  width: 28px;
  flex-shrink: 0;
}

.site-row__error {
  color: var(--warn);
  font-size: 11px;
  margin: 4px 0 0;
}

.field__add {
  background: transparent;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 12px;
  padding: 5px 10px;
  cursor: pointer;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.modal__btn {
  font-family: inherit;
  font-size: 12px;
  padding: 7px 14px;
  border-radius: var(--radius);
  cursor: pointer;
}

.modal__btn--ghost {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-dim);
}

.modal__btn--save {
  background: var(--accent);
  border: 1px solid var(--accent);
  color: #04201d;
  font-weight: 700;
}
</style>
