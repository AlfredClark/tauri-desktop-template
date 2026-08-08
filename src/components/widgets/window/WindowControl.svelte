<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { Minus, Pin, PinOff, Square, X, Maximize } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";
  import { invokeCommand } from "$libs/ipc";
  import { m } from "$libs/i18n/paraglide/messages";
  import ConfirmDialog from "$components/widgets/overlay/ConfirmDialog.svelte";
  import TooltipButton from "$components/widgets/overlay/TooltipButton.svelte";

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
    <TooltipButton label={m.window_control_pin()} onclick={toggleAlwaysOnTop} class="h-8 w-11 rounded-none">
      {#if alwaysOnTop}
        <PinOff class="size-4" />
      {:else}
        <Pin class="size-4" />
      {/if}
    </TooltipButton>
  {/if}
  <TooltipButton label={m.window_control_minimize()} onclick={() => void appWindow.minimize()} class="h-8 w-11 rounded-none">
    <Minus class="size-4" />
  </TooltipButton>
  <TooltipButton
    label={m.window_control_maximize()}
    onclick={() => void appWindow.toggleMaximize()}
    class="h-8 w-11 rounded-none"
  >
    {#if maximized}
      <Square class="size-4" />
    {:else}
      <Maximize class="size-4" />
    {/if}
  </TooltipButton>
  <!-- 关闭确认（复合组件式用法示例）：关闭按钮即 AlertDialog 触发器，确认后关闭窗口；
       双委托（Tooltip + AlertDialog）经 TooltipButton 的 extraProps 内部合并，调用方无感知 -->
  <ConfirmDialog
    title={m.window_control_close_confirm_title()}
    message={m.window_control_close_confirm_message()}
    variant="destructive"
    onConfirm={() => void appWindow.close()}
  >
    {#snippet trigger({ props })}
      <TooltipButton
        label={m.window_control_close()}
        extraProps={props}
        class="h-8 w-11 rounded-none hover:bg-destructive hover:text-white dark:hover:bg-destructive dark:hover:text-white"
      >
        <X class="size-4" />
      </TooltipButton>
    {/snippet}
  </ConfirmDialog>
</div>
