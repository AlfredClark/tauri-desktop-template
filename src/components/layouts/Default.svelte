<script lang="ts">
  import TabsNavBar from "$components/widgets/navigation/TabsNavBar.svelte";
  import WindowControl from "$components/widgets/window/WindowControl.svelte";
  import { m } from "$libs/i18n/paraglide/messages";
  let { children } = $props();

  // 版权年份取运行期当前年，不硬编码
  const currentYear = new Date().getFullYear();
  // package.json 的 author 兼容字符串与对象两种形态，统一取展示名
  // （JSON 字面量静态类型可能只含其一，先扩宽联合再判别）
  const pkgAuthor = __APP_PKG__.author as string | { name?: string };
  const appAuthor = typeof pkgAuthor === "string" ? pkgAuthor : (pkgAuthor.name ?? "");
</script>

<div class="flex h-screen w-screen flex-col overflow-hidden">
  <header class="w-full shrink-0 border-b p-1">
    <div class="flex h-8 items-center select-none" data-tauri-drag-region="deep">
      <div class="flex items-center gap-2 pl-3">
        <img src="/icon.png" alt="icon" class="size-4" />
        <span class="text-sm font-medium">{__APP_TAURI_CONF__.app.windows[0].title}</span>
      </div>
      <div class="flex-1" data-tauri-drag-region="deep"></div>
      <WindowControl />
    </div>
  </header>
  <nav class="flex w-full shrink-0 items-center border-b select-none">
    <TabsNavBar />
  </nav>
  <main class="flex-1 overflow-y-auto">
    {@render children()}
  </main>
  <footer class="flex w-full shrink-0 items-center justify-center border-t select-none">
    <span class="m-1 text-xs text-muted-foreground">
      {m.footer_copyright({ year: String(currentYear), author: appAuthor })}
    </span>
  </footer>
</div>
