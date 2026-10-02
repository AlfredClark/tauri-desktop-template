<script lang="ts">
  // 仪表盘布局：顶部标题栏 + 左侧固定导航 + 内容区 + 底边，适合页面多的后台型应用。
  // 与 sidebar 的差异：侧栏固定不可折叠，窄屏自动收为图标栏（断点与 IsMobile 默认值同源）。
  import type { Snippet } from "svelte";
  import { IsMobile } from "$hooks/is-mobile.svelte";
  import Copyright from "$components/layout/parts/copyright.svelte";
  import DashboardNavBar from "$components/layout/parts/dashboard-nav-bar.svelte";
  import TitleBar from "$components/layout/parts/title-bar.svelte";
  import { cn } from "$libs/utils/shadcn-svelte";

  let { children }: { children: Snippet } = $props();

  // 窄屏收为图标栏，标签走 SidebarMenuButton 的 tooltip 展示，无需抽屉逻辑
  const isMobile = new IsMobile();
</script>

<div data-layout="dashboard" class={cn("flex h-screen w-full flex-col overflow-hidden")}>
  <header class={cn("w-full shrink-0 border-b")}>
    <TitleBar />
  </header>
  <div class={cn("flex min-h-0 w-full flex-1 flex-row overflow-hidden")}>
    <aside class={cn("shrink-0 overflow-y-auto border-r", isMobile.current ? "w-14" : "w-52")}>
      <DashboardNavBar compact={isMobile.current} />
    </aside>
    <main class={cn("flex min-h-0 flex-1 flex-col overflow-y-auto")}>
      {@render children()}
    </main>
  </div>
  <footer class={cn("flex w-full shrink-0 items-center justify-center border-t")}>
    <Copyright class={cn("m-1 text-xs text-muted-foreground select-none")} />
  </footer>
</div>
