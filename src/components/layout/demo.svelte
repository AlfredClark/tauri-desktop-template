<script lang="ts">
  // 演示布局：侧边栏语义骨架，与默认布局形成结构反差，用于验证切换效果。
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div data-layout="demo">
  <aside></aside>
  <div>
    <header></header>
    <main>
      {@render children()}
    </main>
  </div>
</div>
