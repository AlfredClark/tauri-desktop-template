<script lang="ts">
  // 布局容器：按注册表动态渲染，新增布局无需改动本文件。
  import type { Snippet } from "svelte";
  import { LAYOUTS, initLayout, layoutState } from "$hooks/layout.svelte";
  import ErrorBoundary from "$components/common/error-boundary.svelte";

  let { children }: { children: Snippet } = $props();

  // 脏数据已在 hooks 回落默认值，此处兜底仅防注册表缺 key 时白屏。
  let Layout = $derived(LAYOUTS[layoutState.name] ?? LAYOUTS.default);

  $effect.pre(() => {
    initLayout();
  });
</script>

<ErrorBoundary>
  {#key layoutState.name}
    <Layout>
      {@render children()}
    </Layout>
  {/key}
</ErrorBoundary>
