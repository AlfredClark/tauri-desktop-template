<script lang="ts">
  // 根布局只负责全局能力：注入全局样式，并用主题监听器、Toast 挂载点与错误边界包裹全部页面。
  // 界面语言的对齐在 +layout.ts 的 load() 里完成，早于本组件首次渲染。
  // 布局容器下沉到 (main) 分组，特殊页面另起分组即可绕开布局。
  import { ModeWatcher } from "mode-watcher";
  import type { Snippet } from "svelte";
  import { configState } from "$hooks/config.svelte";
  import { maybeAutoCheckForUpdate } from "$hooks/updater.svelte";
  import ErrorBoundary from "$components/common/error-boundary.svelte";
  import { Toaster } from "$components/shadcn-svelte/sonner";
  import "./layout.css";

  const { children }: { children: Snippet } = $props();

  // 启动静默检查更新：开着开关才执行，单会话一次，非 Tauri 环境跳过
  $effect(() => {
    maybeAutoCheckForUpdate(configState.value?.auto_check_update ?? false);
  });
</script>

<!-- 跟随系统主题，并把 .dark 类同步到根元素 -->
<ModeWatcher defaultMode="system" />

<!-- 全局唯一的 Toast 挂载点：主题由 sonner 内部跟随 mode-watcher -->
<Toaster position="bottom-right" richColors closeButton />

<ErrorBoundary>
  {@render children()}
</ErrorBoundary>
