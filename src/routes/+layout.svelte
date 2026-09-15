<script lang="ts">
  // 根布局只负责两件事：注入全局样式，并用主题监听器与错误边界包裹全部页面。
  // 界面语言的对齐在 +layout.ts 的 load() 里完成，早于本组件首次渲染。
  import { ModeWatcher } from "mode-watcher";
  import ErrorBoundary from "$components/common/ErrorBoundary.svelte";
  import "./layout.css";

  const { children } = $props();
</script>

<!-- 跟随系统主题，并把 .dark 类同步到根元素 -->
<ModeWatcher defaultMode="system" />

<ErrorBoundary>
  {@render children()}
</ErrorBoundary>
