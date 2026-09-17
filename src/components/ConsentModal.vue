<script setup lang="ts">
import { ref } from 'vue';
import type { LoadedPlugin } from '../types/plugin';

defineProps<{ plugin: LoadedPlugin; input: string }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();

const acknowledged = ref(false);
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div class="modal">
      <div class="modal__badge tag tag--warn">consent required</div>
      <h2 class="modal__title">Run "{{ plugin.manifest.name }}" against this target?</h2>
      <p class="modal__body">
        This plugin is flagged <code>sensitiveData: true</code> in its manifest. Running it against
        <strong>{{ input }}</strong> will be recorded in the audit log (plugin, input, outcome, operator, timestamp — never
        the returned data). This gate is enforced by <code>core/consent-manager.js</code>, not a UI convention — there is no
        way to run this plugin without passing through it.
      </p>
      <label class="modal__check">
        <input v-model="acknowledged" type="checkbox" />
        I'm authorized to run this lookup against this target and understand it will be logged.
      </label>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--ghost" @click="emit('cancel')">Cancel</button>
        <button class="modal__btn modal__btn--confirm" :disabled="!acknowledged" @click="emit('confirm')">
          Authorize &amp; run
        </button>
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
}

.modal {
  width: 460px;
  max-width: calc(100vw - 32px);
  background: var(--bg-panel-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 20px;
}

.modal__badge {
  margin-bottom: 12px;
}

.modal__title {
  font-size: 15px;
  margin: 0 0 10px;
}

.modal__body {
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1.6;
  margin: 0 0 16px;
}

.modal__body code {
  color: var(--text);
}

.modal__check {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  color: var(--text);
  margin-bottom: 18px;
  cursor: pointer;
}

.modal__check input {
  margin-top: 2px;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

.modal__btn--confirm {
  background: var(--warn);
  border: 1px solid var(--warn);
  color: #1a1204;
  font-weight: 600;
}

.modal__btn--confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
