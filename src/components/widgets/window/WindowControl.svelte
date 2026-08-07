<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { Minus, Pin, PinOff, Square, X, Maximize } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";
  import { Button } from "$components/ui/button";
  import { Tooltip, TooltipContent, TooltipTrigger } from "$components/ui/tooltip";
  import { invokeCommand } from "$libs/ipc";
  import { m } from "$libs/i18n/paraglide/messages";

  const appWindow = getCurrentWindow();

  let maximized = $state(false);
  let alwaysOnTop = $state(false);
  let alwaysOnTopSupported = $state(true);
  let unlistenResized: (() => void) | undefined;

  onMount(() => {
    // 置顶能力探测：Linux Wayland 下 GTK keep_above 无效，隐藏置顶按钮
    // （查询失败默认显示，?? true 兜底）
    void invokeCommand<boolean>("is_always_on_top_supported").then((v) => (alwaysOnTopSupported = v ?? true));
    void appWindow.isMaximized().then((v) => (maximized = v));
    void appWindow.isAlwaysOnTop().then((v) => (alwaysOnTop = v));
    void appWindow
      .onResized(async () => {
        maximized = await appWindow.isMaximized();
      })
      .then((fn) => (unlistenResized = fn));
  });

  onDestroy(() => {
    unlistenResized?.();
  });

  async function toggleAlwaysOnTop() {
    alwaysOnTop = !alwaysOnTop;
    try {
      await appWindow.setAlwaysOnTop(alwaysOnTop);
      alwaysOnTop = await appWindow.isAlwaysOnTop();
    } catch {
      alwaysOnTop = !alwaysOnTop;
    }
  }
</script>

<div class="flex h-8 items-center">
  {#if alwaysOnTopSupported}
    <Tooltip>
      <TooltipTrigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            class="h-8 w-11 rounded-none"
            aria-label={m.window_control_pin()}
            onclick={toggleAlwaysOnTop}
          >
            {#if alwaysOnTop}
              <PinOff class="size-4" />
            {:else}
              <Pin class="size-4" />
            {/if}
          </Button>
        {/snippet}
      </TooltipTrigger>
      <TooltipContent>{m.window_control_pin()}</TooltipContent>
    </Tooltip>
  {/if}
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          class="h-8 w-11 rounded-none"
          aria-label={m.window_control_minimize()}
          onclick={() => void appWindow.minimize()}
        >
          <Minus class="size-4" />
        </Button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent>{m.window_control_minimize()}</TooltipContent>
  </Tooltip>
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          class="h-8 w-11 rounded-none"
          aria-label={m.window_control_maximize()}
          onclick={() => void appWindow.toggleMaximize()}
        >
          {#if maximized}
            <Square class="size-4" />
          {:else}
            <Maximize class="size-4" />
          {/if}
        </Button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent>{m.window_control_maximize()}</TooltipContent>
  </Tooltip>
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          class="h-8 w-11 rounded-none hover:bg-destructive hover:text-white dark:hover:bg-destructive dark:hover:text-white"
          aria-label={m.window_control_close()}
          onclick={() => void appWindow.close()}
        >
          <X class="size-4" />
        </Button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent>{m.window_control_close()}</TooltipContent>
  </Tooltip>
</div>
