<script lang="ts">
  import { arch, family, locale, platform, type as osType, version } from "@tauri-apps/plugin-os";
  import { onMount } from "svelte";
  import { Label } from "$components/ui/label";
  import { m } from "$libs/i18n/paraglide/messages";

  // os 插件同步 API，模块级直接取值（os:default 权限已覆盖）
  const staticRows = [
    { key: "platform", label: m.about_system_platform, value: platform() },
    { key: "version", label: m.about_system_version, value: version() },
    { key: "type", label: m.about_system_type, value: osType() },
    { key: "arch", label: m.about_system_arch, value: arch() },
    { key: "family", label: m.about_system_family, value: family() },
  ] as const;

  // locale 为异步 API：初始兜底占位符，onMount 加载真实值覆盖
  const localeFallback = "—";
  let sysLocale = $state(localeFallback);

  onMount(() => {
    void locale().then((value) => {
      sysLocale = value || localeFallback;
    });
  });

  // 异步 locale 经 $derived 并入展示行，保持单一循环且跟随响应式
  const rows = $derived([...staticRows, { key: "locale", label: m.about_system_locale, value: sysLocale }]);
</script>

{#each rows as row (row.key)}
  <div class="flex items-center justify-between gap-4 px-4 py-4">
    <Label>{row.label()}</Label>
    <span class="text-sm text-muted-foreground">{row.value}</span>
  </div>
{/each}
