import { defineStore } from 'pinia';
import { mockAuditLog } from '../data/mockAuditLog';
import type { AuditEntry } from '../types/plugin';

export const useAuditStore = defineStore('audit', {
  state: () => ({
    entries: [...mockAuditLog] as AuditEntry[],
  }),
  getters: {
    sorted: (state) => [...state.entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  },
  actions: {
    record(entry: AuditEntry) {
      this.entries.push(entry);
    },
  },
});
