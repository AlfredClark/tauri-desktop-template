<script lang="ts">
  // 布局 A：居中单列最小实现，与演示布局形成结构反差，用于验证切换效果。
  import type { Snippet } from "svelte";
  import { cn } from "$libs/utils/shadcn-svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div data-layout="default" class={cn("flex min-h-screen flex-col bg-background text-foreground")}>
  <main
    class={cn(
      "mx-auto flex h-full w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-6",
    )}
  >
    {@render children()}
  </main>
</div>
