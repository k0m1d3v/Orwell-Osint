<script setup lang="ts">
import AppSidebar from './components/AppSidebar.vue';
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <main class="shell__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100%;
  min-height: 100vh;
}

.shell__main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
</style>
