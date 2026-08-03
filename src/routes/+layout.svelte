<script lang="ts">
  import { onMount } from "svelte";
  import { getLocale } from "$lib/i18n";

  // SPA 无服务端 hooks：app.html 硬编码 lang="en"，此处客户端同步实际语言；
  // layout load 已先于本组件挂载执行 syncLocale，挂载时语言即已正确；
  // changeLocale 默认 reload 页面，重挂载后自动更新
  onMount(() => {
    document.documentElement.lang = getLocale();
  });
</script>

<slot />
