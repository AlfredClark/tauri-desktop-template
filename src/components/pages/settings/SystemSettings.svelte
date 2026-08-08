<script lang="ts">
  import { onMount } from "svelte";
  import { Label } from "$components/ui/label";
  import { Switch } from "$components/ui/switch";
  import { invokeCommand, type SystemConfig } from "$libs/ipc";
  import { m } from "$libs/i18n/paraglide/messages";

  // 系统配置初始兜底值（与后端默认一致）；onMount 加载真实快照覆盖
  let config = $state<SystemConfig>({ locale: "en", autostart: false, tray: true, notification: false });

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
  }

  async function toggleNotification() {
    const next = await invokeCommand<boolean>("toggle_notification");
    if (next !== null) config.notification = next;
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
    <Label>{m.settings_notification()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_notification_description()}</p>
  </div>
  <Switch checked={config.notification} onCheckedChange={toggleNotification} />
</div>
