<script setup lang="ts">
import AppShell from "./shell/AppShell.vue";
</script>

<template>
  <AppShell />
</template>

<style>
/* 窗口即应用外框：浏览器默认的 body 8px 外边距会把六个区域整体内缩，
   并让 height:100vh 的骨架溢出出滚动条 */
html,
body {
  margin: 0;
}
</style>
