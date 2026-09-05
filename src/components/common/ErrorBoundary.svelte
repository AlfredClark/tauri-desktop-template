<script lang="ts">
  import type { Snippet } from "svelte";
  import { Button } from "$components/shadcn-svelte/button";
  import * as Card from "$components/shadcn-svelte/card";

  let { children }: { children: Snippet } = $props();

  let isDev = import.meta.env.DEV;
</script>

<svelte:boundary>
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
            <span class="text-wrap">
              {error instanceof Error
                ? `${error.name}: ${error.message}\n${error.stack}`
                : String(error)}
            </span>
          {/if}
        </Card.Content>
        <Card.Footer class="flex w-full flex-row justify-around">
          <Button variant="outline" class="min-w-1/3" onclick={reset}>重试</Button>
        </Card.Footer>
      </Card.Root>
    </div>
  {/snippet}
</svelte:boundary>
