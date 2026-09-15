<script lang="ts">
  // 渲染异常边界：捕获子树的渲染错误，上报 plugin-log（堆栈仅开发环境展示），并提供重试入口。
  // 后端 panic 由 cores/system.rs 的 panic 钩子处理，两者互不替代。
  import { error as logError } from "@tauri-apps/plugin-log";
  import type { Snippet } from "svelte";
  import { Button } from "$components/shadcn-svelte/button";
  import * as Card from "$components/shadcn-svelte/card";

  let { children }: { children: Snippet } = $props();

  let isDev = import.meta.env.DEV;

  async function handleBoundaryError(err: unknown) {
    const errorDetails =
      err instanceof Error
        ? `[UI Boundary Error] ${err.name}: ${err.message}\nStack:\n${err.stack || "No stack trace"}`
        : `[UI Boundary Error] Non-error object thrown: ${String(err)}`;

    // 控制台先打印
    console.error(err);

    // 调用 tauri_plugin_log 前端绑定 API
    try {
      await logError(errorDetails);
    } catch (pluginErr) {
      console.warn("Failed to write error via tauri_plugin_log:", pluginErr);
    }
  }
</script>

<svelte:boundary onerror={handleBoundaryError}>
  {@render children()}

  {#snippet failed(error, reset)}
    <div class="flex h-screen w-screen items-center justify-center overflow-hidden p-4">
      <Card.Root class="flex h-full max-h-1/2 w-full max-w-3/5 flex-col">
        <Card.Header>
          <Card.Title>组件渲染异常</Card.Title>
          <Card.Description>当前组件无法正常加载。您可以尝试重试或退出。</Card.Description>
        </Card.Header>
        <Card.Content class="flex-1 overflow-y-auto">
          {#if isDev}
            <pre class="font-mono text-sm text-wrap text-destructive">{error instanceof Error
                ? `${error.name}: ${error.message}\n${error.stack}`
                : String(error)}</pre>
          {/if}
        </Card.Content>
        <Card.Footer class="flex w-full flex-row justify-around">
          <Button variant="outline" class="min-w-1/3" onclick={reset}>重试</Button>
        </Card.Footer>
      </Card.Root>
    </div>
  {/snippet}
</svelte:boundary>
