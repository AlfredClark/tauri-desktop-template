<script lang="ts">
  // 默认布局：单列语义骨架，不带样式，业务样式由页面自带。
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div data-layout="default">
  <header></header>
  <main>
    {@render children()}
  </main>
  <footer></footer>
</div>
