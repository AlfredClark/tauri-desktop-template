<script lang="ts">
  // 根布局只负责两件事：注入全局样式，并用主题监听器与布局容器包裹全部页面。
  // 界面语言的对齐在 +layout.ts 的 load() 里完成，早于本组件首次渲染。
  // 布局容器内部已含错误边界，切换失败同样被接管。
  import { ModeWatcher } from "mode-watcher";
  import LayoutContainer from "$components/common/layout-container.svelte";
  import { Toaster } from "$components/shadcn-svelte/sonner";
  import "./layout.css";

  const { children } = $props();
</script>

<!-- 跟随系统主题，并把 .dark 类同步到根元素 -->
<ModeWatcher defaultMode="system" />

<!-- 全局唯一的 Toast 挂载点：主题由 sonner 内部跟随 mode-watcher -->
<Toaster position="bottom-right" richColors closeButton />

<LayoutContainer>
  {@render children()}
</LayoutContainer>
