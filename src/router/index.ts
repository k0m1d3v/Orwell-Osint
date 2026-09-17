import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/registry' },
    { path: '/registry', name: 'registry', component: () => import('../views/PluginRegistryView.vue') },
    { path: '/run/:pluginId', name: 'run', component: () => import('../views/RunView.vue'), props: true },
    { path: '/audit', name: 'audit', component: () => import('../views/AuditTrailView.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
  ],
});

export default router;
