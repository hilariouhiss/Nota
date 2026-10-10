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

/* 区域高度取自密度令牌（§4.3），而每个区域各带 1px 分隔线：
   默认的 content-box 会把边框加在 height 之外，五个区域各多 1px */
*,
*::before,
*::after {
  box-sizing: border-box;
}
</style>
