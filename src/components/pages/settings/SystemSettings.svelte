<script lang="ts">
  import { onMount } from "svelte";
  import { Label } from "$components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$components/ui/select";
  import { Switch } from "$components/ui/switch";
  import { invokeCommand, type SystemConfig } from "$libs/ipc";
  import { m } from "$libs/i18n/paraglide/messages";
  import { settings, type CloseBehaviorName } from "$libs/stores";

  const { closeBehavior } = settings;

  // 系统配置初始兜底值（与后端默认一致）；onMount 加载真实快照覆盖
  let config = $state<SystemConfig>({ locale: "en", autostart: false, tray: true, notification: false });

  /** 关闭行为选项：value 即 CloseBehaviorName 值域 */
  const closeBehaviorOptions = [
    { value: "ask", label: m.settings_close_behavior_ask },
    { value: "quit", label: m.settings_close_behavior_quit },
    { value: "minimize", label: m.settings_close_behavior_minimize },
  ] as const;

  /** 选中项文本（Select.Trigger 需调用方渲染；未知值回退首个选项） */
  const closeBehaviorLabel = $derived(
    closeBehaviorOptions.find((opt) => opt.value === $closeBehavior)?.label() ?? closeBehaviorOptions[0].label(),
  );

  onMount(() => {
    void invokeCommand<SystemConfig>("get_config").then((value) => {
      if (value) config = value;
    });
  });

  // 切换类命令返回切换后的新值（先 OS 生效再落盘）；失败返回 null，保持原 UI 状态即回滚
  async function toggleAutostart() {
    const next = await invokeCommand<boolean>("toggle_autostart");
    if (next !== null) config.autostart = next;
  }

  async function toggleTray() {
    const next = await invokeCommand<boolean>("toggle_tray");
    if (next !== null) config.tray = next;
    // 关闭托盘时最小化到托盘失去恢复入口，联动回退为弹窗询问（minimize 仅托盘开启时可选）
    if (next === false && closeBehavior.get() === "minimize") {
      closeBehavior.set("ask");
    }
  }

  async function toggleNotification() {
    const next = await invokeCommand<boolean>("toggle_notification");
    if (next !== null) config.notification = next;
  }

  /** 关闭行为切换：minimize 仅托盘开启时可选（SelectItem disabled 已在 UI 层约束） */
  function handleCloseBehaviorChange(value: string | undefined) {
    if (value && value !== $closeBehavior) {
      closeBehavior.set(value as CloseBehaviorName);
    }
  }
</script>

<div class="flex items-center justify-between gap-4 px-4 py-4">
  <div class="space-y-1">
    <Label>{m.settings_autostart()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_autostart_description()}</p>
  </div>
  <Switch checked={config.autostart} onCheckedChange={toggleAutostart} />
</div>

<div class="flex items-center justify-between gap-4 px-4 py-4">
  <div class="space-y-1">
    <Label>{m.settings_tray()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_tray_description()}</p>
  </div>
  <Switch checked={config.tray} onCheckedChange={toggleTray} />
</div>

<div class="flex items-center justify-between gap-4 px-4 py-4">
  <div class="space-y-1">
    <Label>{m.settings_close_behavior()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_close_behavior_description()}</p>
  </div>
  <Select type="single" value={$closeBehavior} onValueChange={handleCloseBehaviorChange}>
    <SelectTrigger class="w-40">
      {closeBehaviorLabel}
    </SelectTrigger>
    <SelectContent>
      {#each closeBehaviorOptions as opt (opt.value)}
        <SelectItem value={opt.value} disabled={opt.value === "minimize" && !config.tray}>
          {opt.label()}
        </SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>

<div class="flex items-center justify-between gap-4 px-4 py-4">
  <div class="space-y-1">
    <Label>{m.settings_notification()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_notification_description()}</p>
  </div>
  <Switch checked={config.notification} onCheckedChange={toggleNotification} />
</div>
