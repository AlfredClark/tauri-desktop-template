<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { listen } from "@tauri-apps/api/event";
  import { onDestroy, onMount } from "svelte";
  import LayoutContainer from "$components/layouts/LayoutContainer.svelte";

  let { children } = $props();

  // 应用菜单（macOS）导航事件：Rust 侧 emit "menu:navigate"（payload 页面标识）→ 切换对应路由
  let unlisten: (() => void) | undefined;
  onMount(() => {
    void listen<"home" | "settings" | "about">("menu:navigate", (event) => {
      const pages = { home: "/", settings: "/settings", about: "/about" } as const;
      // 经 $app/paths 的 resolve 包一层：满足内部导航校验（eslint 规则要求）且自动加 base 前缀
      void goto(resolve(pages[event.payload] ?? "/"));
    })
      .then((fn) => (unlisten = fn))
      .catch(() => {});
  });
  onDestroy(() => unlisten?.());
</script>

<LayoutContainer>
  {@render children()}
</LayoutContainer>
