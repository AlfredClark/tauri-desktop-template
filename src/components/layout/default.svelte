<script lang="ts">
  // 默认布局
  import type { Snippet } from "svelte";
  import NavTabsBar from "$components/widget/layout/nav-tabs-bar.svelte";
  import TitleBar from "$components/widget/layout/title-bar.svelte";
  import Copyright from "$components/widget/layout/copyright.svelte";
  import { cn } from "$libs/utils/shadcn-svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div data-layout="default" class={cn("flex h-screen w-full flex-col overflow-hidden")}>
  <header class={cn("w-full shrink-0 border-b")}>
    <TitleBar />
  </header>
  <nav class={cn("w-full shrink-0 border-b")}>
    <NavTabsBar />
  </nav>
  <main
    class={cn("flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden")}
  >
    {@render children()}
  </main>

  <footer class={cn("flex w-full shrink-0 items-center justify-center border-t")}>
    <Copyright class={cn("m-1 text-xs text-muted-foreground select-none")} />
  </footer>
</div>
