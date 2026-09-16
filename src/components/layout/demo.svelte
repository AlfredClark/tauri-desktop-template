<script lang="ts">
  // 布局 B：侧边栏加顶栏最小实现，与默认布局形成结构反差，用于验证切换效果。
  import type { Snippet } from "svelte";
  import { cn } from "$libs/utils/shadcn-svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div data-layout="demo" class={cn("flex min-h-screen bg-background text-foreground")}>
  <aside class={cn("hidden w-56 shrink-0 flex-col border-r bg-sidebar p-4 sm:flex")}>
    <p class={cn("text-sm font-medium text-sidebar-foreground")}>演示侧边栏</p>
  </aside>
  <div class={cn("flex min-w-0 flex-1 flex-col")}>
    <header class={cn("border-b px-4 py-3")}>
      <p class={cn("text-sm font-medium")}>演示顶栏</p>
    </header>
    <main class={cn("h-full w-full flex-1 flex-col items-center justify-center px-4 py-6")}>
      {@render children()}
    </main>
  </div>
</div>
