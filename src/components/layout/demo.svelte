<script lang="ts">
  // 演示布局
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div data-layout="demo" class="contents">
  <aside></aside>
  <div>
    <header></header>
    <main>
      {@render children()}
    </main>
  </div>
</div>
