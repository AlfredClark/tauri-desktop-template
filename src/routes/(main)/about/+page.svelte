<script lang="ts">
  // 关于页：应用元信息、运行平台与内联更新面板。
  // 更新状态走全局 hook，检查中 / 下载中切页再回来保持原样。
  import type { SystemInfo } from "$libs/commands/types";
  import {
    checkForUpdate,
    downloadAndInstall,
    restartApp,
    updaterState,
  } from "$hooks/updater.svelte";
  import { Button } from "$components/shadcn-svelte/button";
  import { Progress } from "$components/shadcn-svelte/progress";
  import { ScrollArea } from "$components/shadcn-svelte/scroll-area";
  import SettingRow from "$components/widget/settings/setting-row.svelte";
  import SettingSection from "$components/widget/settings/setting-section.svelte";
  import commands from "$libs/commands";
  import { m } from "$libs/i18n/paraglide/messages";
  import { toast } from "$libs/utils/toast";
  import { openExternal } from "$libs/utils/opener";
  import GithubLogo from "$components/common/icons/github-logo.svelte";

  // 应用元信息以构建常量为唯一来源（版本号与 tauri.conf.json 一致）
  const appName = __APP_TAURI_CONF__.productName;
  const appVersion = __APP_TAURI_CONF__.version;
  const appDescription = __APP_PKG__.description;
  const appLicense = __APP_PKG__.license;
  const appAuthor = __APP_PKG__.author;
  const appHomepage = __APP_PKG__.homepage;
  const appRepository = __APP_PKG__.repository.url;
  const appFeedback = __APP_PKG__.bugs.url;

  /** 运行平台信息；加载失败留空，行内回落占位 */
  let sysInfo = $state<SystemInfo | null>(null);

  /** 下载百分比；服务端未给总量时回落不确定进度 */
  const downloadPercent = $derived(
    updaterState.total ? Math.round((updaterState.downloaded / updaterState.total) * 100) : null,
  );

  // 关于页挂载即拉一次平台信息，失败 toast 后行内保持占位
  $effect(() => {
    void commands
      .getSystemInfo()
      .success((info) => {
        sysInfo = info;
      })
      .failed(() => {
        toast.error(m.about_system_failed());
      });
  });

  /** 外链经 opener 打开；浏览器预览等无运行时按失败提示 */
  async function handleOpenLink(url: string): Promise<void> {
    if (!(await openExternal(url))) toast.error(m.about_open_failed());
  }
</script>

<!-- 页面级纵向滚动：内容超高时在视口内滚动；内层保持水平居中、垂直置顶 -->
<ScrollArea class="h-full w-full">
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
    <h1 class="text-2xl font-medium">{m.page_about_title()}</h1>

    <SettingSection title={m.about_app_info_title()}>
      <SettingRow label={m.about_app_name()} description={appName} />

      <SettingRow label={m.about_current_version()} description={appVersion}>
        {#snippet control()}
          {#if updaterState.phase === "checking" || updaterState.phase === "downloading"}
            <Button size="sm" disabled>
              {updaterState.phase === "checking" ? m.updater_checking() : m.updater_downloading()}
            </Button>
          {:else}
            <Button size="sm" onclick={() => void checkForUpdate()}>
              {m.updater_check_update()}
            </Button>
          {/if}
        {/snippet}
      </SettingRow>

      {#if updaterState.phase === "available" && updaterState.latest}
        <div class="flex flex-col gap-3 py-4">
          <p class="text-sm font-medium">
            {m.updater_update_available()}：{updaterState.latest.version}
          </p>
          {#if updaterState.latest.body}
            <pre
              class="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{updaterState
                .latest.body}</pre>
          {/if}
          <div>
            <Button size="sm" onclick={() => void downloadAndInstall()}>
              {m.updater_download_and_install()}
            </Button>
          </div>
        </div>
      {:else if updaterState.phase === "downloading"}
        <div class="flex flex-col gap-3 py-4">
          <p class="text-sm font-medium">
            {m.updater_downloading()}{downloadPercent === null ? "…" : ` ${downloadPercent}%`}
          </p>
          <Progress value={downloadPercent} />
        </div>
      {:else if updaterState.phase === "ready"}
        <div class="flex flex-col gap-3 py-4">
          <p class="text-sm font-medium">{m.updater_update_ready()}</p>
          <div>
            <Button size="sm" onclick={() => restartApp()}>{m.updater_restart_now()}</Button>
          </div>
        </div>
      {:else if updaterState.phase === "error" && updaterState.error}
        <div class="py-4">
          <p class="text-sm text-destructive">{updaterState.error}</p>
        </div>
      {/if}

      <SettingRow label={m.about_description()} description={appDescription} />

      <SettingRow label={m.about_license()} description={appLicense} />

      <SettingRow label={m.about_author()} description={appAuthor} />
    </SettingSection>

    <SettingSection title={m.about_project_info_title()}>
      <SettingRow label={m.about_homepage()} description={appHomepage}>
        {#snippet control()}
          <Button size="sm" variant="outline" onclick={() => void handleOpenLink(appHomepage)}>
            <GithubLogo />
            {m.about_open()}
          </Button>
        {/snippet}
      </SettingRow>
      <SettingRow label={m.about_repository()} description={appRepository}>
        {#snippet control()}
          <Button size="sm" variant="outline" onclick={() => void handleOpenLink(appRepository)}>
            <GithubLogo />
            {m.about_open()}
          </Button>
        {/snippet}
      </SettingRow>
      <SettingRow label={m.about_feedback()} description={appFeedback}>
        {#snippet control()}
          <Button size="sm" variant="outline" onclick={() => void handleOpenLink(appFeedback)}>
            <GithubLogo />
            {m.about_open()}
          </Button>
        {/snippet}
      </SettingRow>
    </SettingSection>

    <SettingSection title={m.about_platform_info_title()}>
      <SettingRow label={m.about_platform()} description={sysInfo?.platform ?? "…"} />

      <SettingRow label={m.about_os_version()} description={sysInfo?.os_version ?? "…"} />

      <SettingRow label={m.about_arch()} description={sysInfo?.arch ?? "…"} />

      <SettingRow label={m.about_hostname()} description={sysInfo?.hostname ?? "…"} />
    </SettingSection>
  </div>
</ScrollArea>
